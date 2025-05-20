import { type BaseEventBusReadonly } from '../baseEventBus';
import { LifecycleFabric, type TransportLifecycleEvents } from '../lifecycles';
import type {
  AnyFunction,
  EventLike,
  TimeoutRef,
  TransportRootNodes,
  Unsubscriber,
} from '../types';
import { noopFunction } from '../utils';

import { AllowedNodes, BufferNode as BufferNodeImpl } from './types';

type SavedData = {
  buffer: any[][];
  timeoutId: TimeoutRef | undefined;
  action: AnyFunction;
  unsubscriber: Unsubscriber;
  mode: 'on' | 'once';
};
type Subscriber = Map<AnyFunction, SavedData>;
type Event = string;
type Subscribers = Map<Event, Subscriber>;

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
    } else {
      this.name = 'buffer_node';
    }

    this.lifecycle = LifecycleFabric.create(this);

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
      mode: 'on',
    });

    LifecycleFabric.send(this, 'subscribe', {
      event: type,
      mode: 'on',
      subscriber: callback,
      subscribersCount: subscribers.size,
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

        LifecycleFabric.send(this, 'unsubscribe', {
          event: type,
          mode: 'once',
          subscriber: callback,
          subscribersCount: subscribers.size,
        });
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
      mode: 'once',
    });

    LifecycleFabric.send(this, 'subscribe', {
      event: type,
      mode: 'once',
      subscriber: callback,
      subscribersCount: subscribers.size,
    });

    return unsubscriber;
  };

  off = (type: string, callback: AnyFunction) => {
    if (this.isDestroyed) return;

    const subscribers = this.__subscribers.get(type);

    const subscriber = subscribers?.get(callback);
    if (subscriber) {
      subscriber.unsubscriber();

      LifecycleFabric.send(this, 'unsubscribe', {
        event: type,
        mode: subscriber.mode,
        subscriber: callback,
        subscribersCount: subscribers?.size ?? 0,
      });
    }
  };

  public getTransports = (): TransportRootNodes => {
    if (this.__node.__isRoot && 'send' in this.__node) {
      return { '': [this.__node] };
    }

    return this.__node.getTransports();
  };

  destroy = (): void => {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.__destroyUnsubscriber) {
      this.__destroyUnsubscriber();
      this.__destroyUnsubscriber = undefined;
    }

    LifecycleFabric.send(this, 'destroy', undefined);
    LifecycleFabric.delete(this);

    for (const subscriber of this.__subscribers) {
      for (const typeSubscribers of subscriber[1]) {
        typeSubscribers[1].unsubscriber();
      }
      subscriber[1].clear();
    }
    this.__subscribers.clear();
  };
}
