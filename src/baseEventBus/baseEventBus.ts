import type { EventLike, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

import type { BaseEventBus as BaseEventBusImpl } from './types';

type Subscribers = Record<string, Set<(...args: any[]) => void>>;

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

    const action: typeof callback = (...args) => {
      this.off(event, action);
      return callback(...args);
    };

    let subscribers = this.__subscribers[event];
    if (subscribers) {
      subscribers.add(action);
    } else {
      subscribers = new Set([action]);
      this.__subscribers[event] = subscribers;
    }

    return this.off.bind(this, event, callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
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

    Promise.resolve().then(() => {
      for (const subscriber of subscribers) {
        subscriber(...args);
      }
    });
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    setTimeout(() => {
      for (const event in this.__subscribers) {
        const subscribers = this.__subscribers[event];
        subscribers.clear();
      }
      this.__subscribers = {};
    }, 0);
  }
}
