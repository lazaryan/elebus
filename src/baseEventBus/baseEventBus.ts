import type { EventLike, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

import type {
  BaseEventBus as BaseEventBusImpl,
  BaseEventBusOptions,
} from './types';

type Event = string;
type AnyAction = (...args: any[]) => void;
type Subscribers = Record<Event, Set<AnyAction>>;

export class BaseEventBus<EVENTS extends EventLike>
  implements BaseEventBusImpl<EVENTS>
{
  /**
   * Whether this node is destroyed.
   * When the value becomes true,
   * all data is cleared and subscriptions stop working.
   */
  public isDestroyed: boolean = false;

  /**
   * @internal
   */
  private __subscribers: Subscribers = {};

  public readonly name: string | undefined;

  constructor(options?: BaseEventBusOptions) {
    this.name = options?.name ?? undefined;
  }

  public on(event: string, callback: AnyAction): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(callback);
    } else {
      this.__subscribers[event] = new Set([callback]);
    }

    return this.off.bind(this, event, callback);
  }

  public off(event: string, callback: AnyAction): void {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[event];
    if (!subscribers || !subscribers.size) return;

    subscribers.delete(callback);
    if (!subscribers.size) {
      delete this.__subscribers[event];
    }
  }

  public send(type: string, ...args: any[]): void {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[type];
    if (!subscribers || !subscribers.size) return;

    queueMicrotask(() => {
      for (const subscriber of subscribers) {
        subscriber(type, ...args);
      }
    });
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    setTimeout(() => {
      for (const event in this.__subscribers) {
        this.__subscribers[event].clear();
      }
      this.__subscribers = {};
    }, 0);
  }
}
