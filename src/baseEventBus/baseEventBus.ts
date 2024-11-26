import type { EventLike, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

import type {
  BaseEventBus as BaseEventBusImpl,
  BaseEventBusOptions,
} from './types';

type Event = string;
type Subscribers = Record<Event, Set<(...args: any[]) => void>>;
type OnceSubscribersMap = Record<Event, WeakMap<() => void, () => void>>;

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
  /**
   * @internal
   */
  private __onceCallbackMap: OnceSubscribersMap = {};

  public readonly name: string | undefined;

  constructor(options?: BaseEventBusOptions) {
    this.name = options?.name ?? undefined;
  }

  public on(event: string, callback: (...args: any[]) => void): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    let subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(callback);
    } else {
      subscribers = new Set([callback]);
      this.__subscribers[event] = subscribers;
    }

    return this.off.bind(this, event, callback);
  }

  public once(
    event: string,
    callback: (...args: any[]) => void,
  ): Unscubscriber {
    if (this.isDestroyed) return noopFunction;
    if (
      this.__onceCallbackMap[event] &&
      this.__onceCallbackMap[event].has(callback)
    )
      return this.off.bind(this, event, callback);

    const action: typeof callback = (...args) => {
      this.off(event, callback);
      return callback(...args);
    };

    let subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(action);
    } else {
      subscribers = new Set([action]);
      this.__subscribers[event] = subscribers;
    }

    if (this.__onceCallbackMap[event]) {
      this.__onceCallbackMap[event].set(callback, action);
    } else {
      const newWeakMap = new WeakMap();
      newWeakMap.set(callback, action);
      this.__onceCallbackMap[event] = newWeakMap;
    }

    return this.off.bind(this, event, callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[event];
    if (!subscribers || !subscribers.size) return;

    if (
      this.__onceCallbackMap[event] &&
      this.__onceCallbackMap[event].has(callback)
    ) {
      const action = this.__onceCallbackMap[event].get(callback);
      this.__onceCallbackMap[event].delete(callback);
      if (!action) return;

      subscribers.delete(action);
      if (!subscribers.size) {
        delete this.__subscribers[event];
        delete this.__onceCallbackMap[event];
      }
    } else {
      subscribers.delete(callback);
      if (!subscribers.size) {
        delete this.__subscribers[event];
      }
    }
  }

  public send(type: string, ...args: any[]): void {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[type];
    if (!subscribers || !subscribers.size) return;

    Promise.resolve().then(() => {
      for (const subscriber of subscribers) {
        subscriber(type, ...args);
      }
    });
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    setTimeout(() => {
      this.__onceCallbackMap = {};

      for (const event in this.__subscribers) {
        this.__subscribers[event].clear();
      }
      this.__subscribers = {};
    }, 0);
  }
}
