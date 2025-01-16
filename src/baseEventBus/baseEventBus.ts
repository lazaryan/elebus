import type { AnyFunction, EventLike, Unsubscriber } from '../types';
import { noopFunction } from '../utils';

import type {
  BaseEventBus as BaseEventBusImpl,
  BaseEventBusOptions,
} from './types';

type Event = string;
type Subscribers = Record<Event, Set<AnyFunction>>;

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

  public on = (event: string, callback: AnyFunction): Unsubscriber => {
    if (this.isDestroyed) return noopFunction;

    const subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(callback);
    } else {
      this.__subscribers[event] = new Set([callback]);
    }

    return this.off.bind(this, event, callback);
  };

  public off = (event: string, callback: AnyFunction): void => {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[event];
    if (!subscribers || !subscribers.size) return;

    subscribers.delete(callback);
    if (!subscribers.size) {
      delete this.__subscribers[event];
    }
  };

  public send = (type: string, ...args: any[]): void => {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[type];
    if (!subscribers || !subscribers.size) return;

    for (const subscriber of subscribers) {
      queueMicrotask(() => {
        subscriber(type, ...args);
      });
    }
  };

  public destroy = (): void => {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    setTimeout(() => {
      for (const event in this.__subscribers) {
        this.__subscribers[event].clear();
      }
      this.__subscribers = {};
    }, 0);
  };
}
