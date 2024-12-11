import type { TransportNodeBase } from '../nodeTypes';
import type { TransportRoot } from '../transport';
import type { EventLike, TimeoutRef, Unsubscriber } from '../types';
import { noopFunction } from '../utils';

type AllowedNodes<EVENTS extends EventLike> =
  | TransportRoot<EVENTS>
  | TransportNodeBase<EVENTS>;

type Callback = (args: any[][]) => void;
type Action = () => void;
type SavedData = {
  buffer: any[][];
  timeoutId: TimeoutRef | undefined;
  action: Action;
  unsubscriber: Unsubscriber;
};
type Subscriber = Map<Callback, SavedData>;
type Event = string;
type Subscribers = Map<Event, Subscriber>;

export class BufferNode<EVENTS extends EventLike> {
  public readonly __isRoot: Readonly<true> = true as const;
  public isDestroyed: boolean = false;

  private __node: AllowedNodes<EVENTS>;
  private __timeout: number;
  private __subscribers: Subscribers = new Map();

  constructor(node: AllowedNodes<EVENTS>, timeout: number) {
    this.__node = node;
    this.__timeout = timeout;

    if (node.__isRoot) {
      setTimeout(() => {
        if (this.__node.isDestroyed) {
          this.destroy();
          return;
        }

        if (this.__node.__isRoot) {
          this.__node.lifecycle.on('destroy', () => this.destroy());
        }
      }, 0);
    }
  }

  on(type: string, callback: (args: any[][]) => void): Unsubscriber {
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

    const subscriber: Pick<SavedData, 'buffer' | 'timeoutId'> = {
      buffer: [],
      timeoutId: undefined,
    };

    const unsubscriber = (): void => {
      if (subscriber.timeoutId) {
        clearTimeout(subscriber.timeoutId);
        subscriber.timeoutId = undefined;
      }

      subscriber.buffer = [];

      const subscribers = this.__subscribers.get(type);
      if (subscribers && subscribers.size) {
        subscribers.delete(callback);

        if (!subscribers.size) {
          this.__subscribers.delete(type);
        }
      }
    };

    const action = (...args: any[]): void => {
      subscriber.buffer.push(args);

      if (subscriber.timeoutId) return;

      subscriber.timeoutId = setTimeout(() => {
        callback(subscriber.buffer);
        subscriber.buffer = [];
        subscriber.timeoutId = undefined;
      }, this.__timeout);
    };

    subscribers.set(
      callback,
      Object.assign(subscriber, { action, unsubscriber }),
    );

    if (this.__node.__isRoot) {
      this.__node.on(type, action);
    } else {
      this.__node.on(type, action);
    }

    return unsubscriber;
  }

  once(type: string, callback: () => void) {
    if (this.isDestroyed) return noopFunction;

    if (this.__node.__isRoot) {
      this.__node.once(type, callback);
    } else {
      this.__node.once(type, callback);
    }
  }

  off(type: string, callback: () => void) {
    if (this.isDestroyed) return;

    if (this.__node.__isRoot) {
      this.__node.off(type, callback);
    } else {
      this.__node.off(type, callback);
    }
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
  }
}
