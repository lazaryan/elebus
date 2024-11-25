import { createBaseEventBus } from '../baseEventBus';
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
  public __isRoot: Readonly<true> = true;

  public isDestroyed = false;

  public lifecycle = createBaseEventBus<TransportLifecycleEvents<EVENTS>>();
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
  }

  public on(event: string, callback: (...args: any[]) => void): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(callback);
      this.lifecycle.send('subscribe', {
        event,
        subscribersCount: subscribers.size,
      });
    } else {
      const subscribers = new Set([callback]);
      this.__subscribers[event] = subscribers;
      this.lifecycle.send('subscribe', { event, subscribersCount: 1 });
    }

    return this.off.bind(this, event, callback);
  }

  public once(
    event: string,
    callback: (...args: any[]) => void,
  ): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const action: typeof callback = (...args) => {
      this.off(event, action);
      return callback(...args);
    };

    const subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(action);
      this.lifecycle.send('subscribe', {
        event,
        subscribersCount: subscribers.size,
      });
    } else {
      const subscribers = new Set([action]);
      this.__subscribers[event] = subscribers;
      this.lifecycle.send('subscribe', { event, subscribersCount: 1 });
    }

    return this.off.bind(this, event, action);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers[event];
    if (!subscribers || !subscribers.size) return;

    subscribers.delete(callback);
    if (!subscribers.size) {
      delete this.__subscribers[event];
    }

    this.lifecycle.send('unubscribe', {
      event,
      subscribersCount: subscribers.size,
    });
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

    this.lifecycle.send('destroy', undefined);
    this.lifecycle.destroy();

    setTimeout(() => {
      for (const event in this.__subscribers) {
        this.__subscribers[event].clear();
      }
      this.__subscribers = {};
    }, 0);
  }
}
