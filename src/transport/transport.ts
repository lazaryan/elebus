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
type InitialAction = (...args: any[]) => void;
type AbortAction = (...args: any[]) => void;
type Subscribers = Map<Event, Set<InitialAction>>;
type OnceSubscribersMap = Map<Event, WeakMap<InitialAction, AbortAction>>;

const lifecycleWeakMap: WeakMap<
  Transport<any>,
  BaseEventBus<TransportLifecycleEvents<any>>
> = new WeakMap();

export class Transport<EVENTS extends EventLike>
  implements TransportRootImpl<EVENTS>
{
  /**
   * @internal
   */
  private __subscribers: Subscribers = new Map();
  /**
   * @internal
   */
  private __onceCallbackMap: OnceSubscribersMap = new Map();

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

    const lifecycle = createBaseEventBus<TransportLifecycleEvents<EVENTS>>({
      name: options?.name ? `${options?.name}__lifecycle` : undefined,
    });

    this.lifecycle = createBaseEventBusReadonly({
      name: lifecycle.name,
      eventBus: lifecycle,
    });
    lifecycleWeakMap.set(this, lifecycle);
  }

  public on(event: string, callback: InitialAction): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const unsubscriber = this.off.bind(this, event, callback);

    const subscribers = this.__subscribers.get(event);
    if (subscribers) {
      if (subscribers.has(callback)) return unsubscriber;
      subscribers.add(callback);
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          mode: 'on',
          subscriber: callback,
          subscribersCount: subscribers.size,
        });
      }
    } else {
      this.__subscribers.set(event, new Set([callback]));
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          mode: 'on',
          subscriber: callback,
          subscribersCount: 1,
        });
      }
    }

    return unsubscriber;
  }

  public once(event: string, callback: InitialAction): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const unsubscriber = this.off.bind(this, event, callback);
    if (this.__onceCallbackMap.get(event)?.has(callback)) return unsubscriber;

    const action: AbortAction = (...args) => {
      this.off(event, callback);
      return callback(...args);
    };

    const weakMap = this.__onceCallbackMap.get(event);
    if (weakMap) {
      weakMap.set(callback, action);
    } else {
      const newWeakMap = new WeakMap();
      newWeakMap.set(callback, action);
      this.__onceCallbackMap.set(event, newWeakMap);
    }

    const subscribers = this.__subscribers.get(event);
    if (subscribers) {
      subscribers.add(action);
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          mode: 'once',
          subscriber: callback,
          subscribersCount: subscribers.size,
        });
      }
    } else {
      this.__subscribers.set(event, new Set([action]));
      const lifecycle = lifecycleWeakMap.get(this);
      if (lifecycle) {
        lifecycle.send('subscribe', {
          event,
          mode: 'once',
          subscriber: callback,
          subscribersCount: 1,
        });
      }
    }

    return unsubscriber;
  }

  public off(event: string, callback: InitialAction): void {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers.get(event);
    if (!subscribers || !subscribers.size) return;

    const isOnce = this.__onceCallbackMap.get(event)?.has(callback);

    if (isOnce) {
      const actioions = this.__onceCallbackMap.get(event);
      if (!actioions) return;

      const action = actioions.get(callback);
      actioions.delete(callback);
      if (!action) return;

      subscribers.delete(action);
      if (!subscribers.size) {
        this.__subscribers.delete(event);
        this.__onceCallbackMap.delete(event);
      }
    } else {
      subscribers.delete(callback);
      if (!subscribers.size) {
        this.__subscribers.delete(event);
      }
    }

    const lifecycle = lifecycleWeakMap.get(this);
    if (lifecycle) {
      lifecycle.send('unubscribe', {
        event,
        mode: isOnce ? 'once' : 'on',
        subscriber: callback,
        subscribersCount: subscribers.size,
      });
    }
  }

  public send(...args: any[]): void {
    if (this.isDestroyed) return;

    const subscribersEvent = this.__subscribers.get(args[0]);
    const subscribersAllEvent = this.__subscribers.get('*');
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
        queueMicrotask(() => {
          if (subscribersEvent?.size) {
            for (const subscriber of subscribersEvent) {
              subscriber(...args);
            }
          }
        });
      }
      if (subscribersAllEvent?.size) {
        queueMicrotask(() => {
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
      lifecycle.send('destroy', undefined);
      lifecycle.destroy();
    }

    lifecycleWeakMap.delete(this);

    setTimeout(() => {
      this.__onceCallbackMap.clear();

      for (const subscriber of this.__subscribers) {
        subscriber[1].clear();
      }
      this.__subscribers.clear();
    }, 0);
  }
}
