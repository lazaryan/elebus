import { BaseEventBus, createBaseEventBus } from '../baseEventBus';
import {
  BaseEventBusReadonly,
  createBaseEventBusReadonly,
} from '../baseEventBusReadonly';
import {
  createTransportReadonlyNode,
  type TransportReadonlyNode,
} from '../transportReadonlyNode';
import type { EventLike, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

import type {
  TransportLifecycleEvents,
  TransportOptions,
  TransportRoot as TransportRootImpl,
} from './types';

type Event = string;
type Subscribers = Record<Event, Set<(...args: any) => void>>;
type OnceSubscribersMap = Record<Event, WeakMap<() => void, () => void>>;

const lifecycleWeakMap: WeakMap<
  Transport<any>,
  BaseEventBus<any>
> = new WeakMap();

export class Transport<EVENTS extends EventLike>
  implements TransportRootImpl<EVENTS>
{
  /**
   * @internal
   */
  private __subscribers: Subscribers = {};
  /**
   * @internal
   */
  private __onceCallbackMap: OnceSubscribersMap = {};

  /**
   * @internal
   */
  public __isRoot: Readonly<true> = true;

  public isDestroyed = false;

  public lifecycle: BaseEventBusReadonly<TransportLifecycleEvents<EVENTS>>;
  /**
   * Transport name
   */
  public readonly name: string | undefined = undefined;
  /**
   * @default false
   */
  public readonly sync: boolean = false;

  constructor(options?: TransportOptions) {
    if (options) {
      this.name = options.name;
      if (options.sync !== undefined) {
        this.sync = options.sync;
      }
    }

    const lifecycleName = options?.name
      ? `${options?.name}__lifecycle`
      : undefined;
    const lifecycle = createBaseEventBus<TransportLifecycleEvents<EVENTS>>({
      name: lifecycleName,
    });

    this.lifecycle = createBaseEventBusReadonly({
      name: lifecycleName,
      eventBus: lifecycle,
    });
    lifecycleWeakMap.set(this, lifecycle);
  }

  public on(event: string, callback: (...args: any[]) => void): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const unsubscriber = this.off.bind(this, event, callback);

    const subscribers = this.__subscribers[event];
    if (subscribers) {
      if (subscribers.has(callback)) return unsubscriber;
      subscribers.add(callback);
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          subscribersCount: subscribers.size,
        });
      }
    } else {
      const subscribers = new Set([callback]);
      this.__subscribers[event] = subscribers;
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          subscribersCount: 1,
        });
      }
    }

    return unsubscriber;
  }

  public once(
    event: string,
    callback: (...args: any[]) => void,
  ): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const unsubscriber = this.off.bind(this, event, callback);
    if (
      this.__onceCallbackMap[event] &&
      this.__onceCallbackMap[event].has(callback)
    )
      return unsubscriber;

    const action: typeof callback = (...args) => {
      this.off(event, callback);
      return callback(...args);
    };

    if (this.__onceCallbackMap[event]) {
      this.__onceCallbackMap[event].set(callback, action);
    } else {
      const newWeakMap = new WeakMap();
      newWeakMap.set(callback, action);
      this.__onceCallbackMap[event] = newWeakMap;
    }

    const subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(action);
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          subscribersCount: subscribers.size,
        });
      }
    } else {
      const subscribers = new Set([action]);
      this.__subscribers[event] = subscribers;
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          subscribersCount: 1,
        });
      }
    }

    return unsubscriber;
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

    const lifecycle = lifecycleWeakMap.get(this);
    if (lifecycle) {
      lifecycle.send('unubscribe', {
        event,
        subscribersCount: subscribers.size,
      });
    }
  }

  public send(...args: any[]): void {
    if (this.isDestroyed) return;

    const subscribersEvent = this.__subscribers[args[0]];
    const subscribersAllEvent = this.__subscribers['*'];
    if (!subscribersEvent?.size && !subscribersAllEvent?.size) return;

    if (this.sync) {
      if (subscribersEvent?.size) {
        for (const subscriber of subscribersEvent) {
          subscriber(...args);
        }
      }
      if (subscribersAllEvent?.size) {
        for (const subscriber of subscribersAllEvent) {
          subscriber(...args);
        }
      }
    } else {
      if (subscribersEvent?.size) {
        Promise.resolve().then(() => {
          if (subscribersEvent?.size) {
            for (const subscriber of subscribersEvent) {
              subscriber(...args);
            }
          }
        });
      }
      if (subscribersAllEvent?.size) {
        Promise.resolve().then(() => {
          if (subscribersAllEvent?.size) {
            for (const subscriber of subscribersAllEvent) {
              subscriber(...args);
            }
          }
        });
      }
    }
  }

  public asReadonly(): TransportReadonlyNode<EVENTS> {
    return createTransportReadonlyNode<EVENTS>(this);
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    const lifecycle = lifecycleWeakMap.get(this);
    if (lifecycle) {
      for (const event in this.__subscribers) {
        lifecycle.send('unubscribe', { event, subscribersCount: 0 });
      }
      lifecycle.send('destroy', undefined);
      lifecycle.destroy();
    }

    lifecycleWeakMap.delete(this);

    setTimeout(() => {
      this.__onceCallbackMap = {};

      for (const event in this.__subscribers) {
        this.__subscribers[event].clear();
      }
      this.__subscribers = {};
    }, 0);
  }
}
