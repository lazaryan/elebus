import {
  BaseEventBus,
  BaseEventBusReadonly,
  createBaseEventBus,
  createBaseEventBusReadonly,
} from '../baseEventBus';
import { TransportLifecycleEvents } from '../rootTypes';
import type {
  AnyFunction,
  EventLike,
  TimeoutRef,
  Unsubscriber,
} from '../types';
import { noopFunction } from '../utils';

import { AllowedNodes, BufferNode as BufferNodeImpl } from './types';

type SavedData = {
  buffer: any[][];
  timeoutId: TimeoutRef | undefined;
  action: AnyFunction;
  unsubscriber: Unsubscriber;
};
type Subscriber = Map<AnyFunction, SavedData>;
type Event = string;
type Subscribers = Map<Event, Subscriber>;

const LIFECYCLE_WEAK_MAP: WeakMap<
  BufferNodeImpl<any>,
  BaseEventBus<TransportLifecycleEvents<any>>
> = new WeakMap();

export class BufferNode<EVENTS extends EventLike>
  implements BufferNodeImpl<EVENTS>
{
  /**
   * @internal
   */
  private __node: AllowedNodes<EVENTS>;
  /**
   * @internal
   */
  private __timeout: number;
  /**
   * @internal
   */
  private __subscribers: Subscribers = new Map();
  /**
   * @internal
   */
  private __destroyUnsubscriber: Unsubscriber | undefined = undefined;

  public readonly __isRoot: Readonly<true> = true as const;

  public isDestroyed: boolean = false;
  public readonly name: Readonly<string | undefined> = undefined;

  public lifecycle: BaseEventBusReadonly<TransportLifecycleEvents<EVENTS>>;

  constructor(node: AllowedNodes<EVENTS>, timeout: number) {
    this.__node = node;
    this.__timeout = timeout;

    if (node.name) {
      this.name = `${node.name}__buffer_node`;
    }

    const lifecycle = createBaseEventBus<TransportLifecycleEvents<EVENTS>>({
      name: this?.name ? `${this?.name}__lifecycle` : undefined,
    });

    this.lifecycle = createBaseEventBusReadonly(lifecycle);
    LIFECYCLE_WEAK_MAP.set(this, lifecycle);

    if (node.__isRoot) {
      setTimeout(() => {
        if (this.__node.isDestroyed) {
          this.destroy();
          return;
        }

        if (this.__node.__isRoot) {
          this.__destroyUnsubscriber = this.__node.lifecycle.on(
            'destroy',
            this.destroy,
          );
        }
      }, 0);
    }
  }

  on = (type: string, callback: AnyFunction): Unsubscriber => {
    if (this.isDestroyed) return noopFunction;

    let subscribers = this.__subscribers.get(type);

    if (subscribers) {
      const action = subscribers.get(callback);
      if (action) {
        return action.unsubscriber;
      }
    }

    if (!subscribers) {
      subscribers = new Map();
      this.__subscribers.set(type, subscribers);
    }

    let buffer: any[][] = [];
    let timeoutId: TimeoutRef | undefined = undefined;

    const action = (...args: any[]): void => {
      buffer.push(args);
      if (timeoutId) return;

      timeoutId = setTimeout(() => {
        if (this.isDestroyed) return;
        callback(buffer);

        buffer = [];
        timeoutId = undefined;
      }, this.__timeout);
    };

    let unsubscriberNode: Unsubscriber;
    if (this.__node.__isRoot) {
      unsubscriberNode = this.__node.on(type, action);
    } else {
      unsubscriberNode = this.__node.on(type, action);
    }

    const unsubscriber = (): void => {
      if (this.isDestroyed) return;

      unsubscriberNode();

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      buffer = [];

      const subscribers = this.__subscribers.get(type);
      if (subscribers && subscribers.size) {
        subscribers.delete(callback);

        if (!subscribers.size) {
          this.__subscribers.delete(type);
        }
      }
    };

    subscribers.set(callback, {
      buffer,
      timeoutId,
      action,
      unsubscriber,
    });

    return unsubscriber;
  };

  once = (type: string, callback: AnyFunction): Unsubscriber => {
    if (this.isDestroyed) return noopFunction;

    let subscribers = this.__subscribers.get(type);

    if (subscribers) {
      const action = subscribers.get(callback);
      if (action) {
        return action.unsubscriber;
      }
    }

    if (!subscribers) {
      subscribers = new Map();
      this.__subscribers.set(type, subscribers);
    }

    let buffer: any[][] = [];
    let timeoutId: TimeoutRef | undefined = undefined;

    let unsubscriberNode: Unsubscriber;
    const unsubscriber = (): void => {
      if (this.isDestroyed) return;

      unsubscriberNode();

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      buffer = [];

      const subscribers = this.__subscribers.get(type);
      if (subscribers && subscribers.size) {
        subscribers.delete(callback);

        if (!subscribers.size) {
          this.__subscribers.delete(type);
        }
      }
    };

    const action = (...args: any[]): void => {
      buffer.push(args);
      if (timeoutId) return;

      timeoutId = setTimeout(() => {
        if (this.isDestroyed) return;
        callback(buffer);

        unsubscriber();
        buffer = [];
        timeoutId = undefined;
      }, this.__timeout);
    };

    if (this.__node.__isRoot) {
      unsubscriberNode = this.__node.on(type, action);
    } else {
      unsubscriberNode = this.__node.on(type, action);
    }

    subscribers.set(callback, {
      buffer,
      timeoutId,
      action,
      unsubscriber,
    });

    return unsubscriber;
  };

  off = (type: string, callback: AnyFunction) => {
    if (this.isDestroyed) return;

    const subscriber = this.__subscribers.get(type)?.get(callback);
    if (subscriber) {
      subscriber.unsubscriber();
    }
  };

  destroy = (): void => {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.__destroyUnsubscriber) {
      this.__destroyUnsubscriber();
      this.__destroyUnsubscriber = undefined;
    }

    const lifecycle = LIFECYCLE_WEAK_MAP.get(this);
    if (lifecycle) {
      lifecycle.send('destroy', undefined);
      lifecycle.destroy();
    }
    LIFECYCLE_WEAK_MAP.delete(this);

    for (const subscriber of this.__subscribers) {
      for (const typeSubscribers of subscriber[1]) {
        typeSubscribers[1].unsubscriber();
      }
      subscriber[1].clear();
    }
    this.__subscribers.clear();
  };
}
