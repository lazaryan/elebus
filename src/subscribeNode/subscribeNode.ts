import {
  createSubscribeReadonlyNode,
  type SubscribeReadonlyNode,
} from '../subscribeReadonlyNode';
import type { TransportRoot } from '../transport';
import type { EventLike, TransportRootNodes, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

import type {
  Namespace,
  SubscribeNode as SubscribeNodeImpl,
  SubscribeNodeOptions,
  Type,
} from './types';
import {
  findChannelNamespaces,
  getSubscribers,
  parseOptionsRoots,
} from './utils';

type Subsciber = (...args: any[]) => void;

type SubscriberRootsMap = Map<TransportRoot<any>, Unscubscriber>;

type SubscriberInfo = {
  mode: 'on' | 'once';
  roots: SubscriberRootsMap;
};

type SubscribersTypesMap = Map<Subsciber, SubscriberInfo>;

type SubscribersTypes = Record<Type, SubscribersTypesMap>;

type SubscribersNamespaces = Record<Namespace, SubscribersTypes>;

type DestroySubscribers = Map<TransportRoot<any>, Unscubscriber>;

export class SubscriberNode<EVENTS extends EventLike>
  implements SubscribeNodeImpl<EVENTS>
{
  /**
   * @internal
   */
  private __roots: TransportRootNodes = {};
  /**
   * @internal
   */
  private __subscribers: SubscribersNamespaces = {};
  /**
   * @internal
   */
  private __destroySubscribers: Record<Namespace, DestroySubscribers> = {};

  public isDestroyed = false;
  public readonly name: string | undefined = undefined;
  /**
   * @internal
   */
  public readonly __isRoot: false = false as const;

  constructor(options?: SubscribeNodeOptions) {
    if (options) {
      if (options.name) {
        this.name = options.name;
      }

      if (options.roots) {
        this.__roots = parseOptionsRoots(options.roots);

        queueMicrotask(() => {
          if (this.isDestroyed) return;

          for (const namespace in this.__roots) {
            const roots = this.__roots[namespace];

            const destroySubscribers = new Map();

            for (const root of roots) {
              if (root.isDestroyed) {
                const index = this.__roots[namespace].indexOf(root);
                if (index === -1) continue;

                this.__roots[namespace].splice(index, 1);
                if (!this.__roots[namespace].length) {
                  delete this.__roots[namespace];
                }

                continue;
              }

              destroySubscribers.set(
                root,
                root.lifecycle.on(
                  'destroy',
                  this.remove.bind(this, namespace, root),
                ),
              );
            }

            if (destroySubscribers.size) {
              this.__destroySubscribers[namespace] = destroySubscribers;
            }
          }
        });
      }
    }
  }

  public getTransports(): TransportRootNodes {
    return this.__roots;
  }

  public add(namespace: Namespace, root: TransportRoot<any>): void {
    if (root.isDestroyed) return;

    if (this.__roots[namespace]) {
      if (this.__roots[namespace].includes(root)) return;
      this.__roots[namespace].push(root);
    } else {
      this.__roots[namespace] = [root];
    }

    let destroySubscribers = this.__destroySubscribers[namespace];
    if (!destroySubscribers) {
      destroySubscribers = new Map();
      this.__destroySubscribers[namespace] = destroySubscribers;
    }

    if (!destroySubscribers.has(root)) {
      destroySubscribers.set(
        root,
        root.lifecycle.on('destroy', this.remove.bind(this, namespace, root)),
      );
    }

    const subscribersNamespace = this.__subscribers[namespace];
    if (!subscribersNamespace) return;

    for (const event in subscribersNamespace) {
      const subscribers = subscribersNamespace[event];
      if (!subscribers || !subscribers.size) continue;

      for (const [callback, { mode, roots }] of subscribers) {
        if (mode === 'on') {
          const action =
            namespace === ''
              ? callback
              : (type: string, ...args: any[]): void => {
                  const event = `${namespace}:${type}`;
                  callback(event, ...args);
                };

          roots.set(root, root.on(event, action));
        } else {
          const action =
            namespace === ''
              ? (type: string, ...args: any[]): void => {
                  callback(type, ...args);
                  roots.delete(root);
                }
              : (type: string, ...args: any[]): void => {
                  const event = `${namespace}:${type}`;
                  callback(event, ...args);
                  roots.delete(root);
                };

          roots.set(root, root.once(event, action));
        }
      }
    }
  }

  public remove(namespace: Namespace, root: TransportRoot<any>): void {
    if (root.isDestroyed) return;
    if (!this.__roots[namespace]) return;

    if (this.__destroySubscribers[namespace]) {
      const destroySubscribers = this.__destroySubscribers[namespace];

      if (destroySubscribers.has(root)) {
        destroySubscribers.get(root)?.();
        destroySubscribers.delete(root);

        if (!destroySubscribers.size) {
          delete this.__destroySubscribers[namespace];
        }
      }
    }

    const index = this.__roots[namespace].indexOf(root);
    if (index === -1) return;
    this.__roots[namespace].splice(index, 1);
    if (!this.__roots[namespace].length) {
      delete this.__roots[namespace];
    }

    const subscribersNamespace = this.__subscribers[namespace];
    if (!subscribersNamespace) return;

    const clearedEvents: string[] = [];

    for (const event in subscribersNamespace) {
      const subscribers = subscribersNamespace[event];
      if (!subscribers || !subscribers.size) continue;

      for (const subscriber of subscribers) {
        const { roots } = subscriber[1];
        if (!roots.has(root)) continue;
        roots.get(root)?.();
        roots.delete(root);
      }

      if (!subscribers.size) {
        clearedEvents.push(event);
      }
    }

    for (const event of clearedEvents) {
      delete subscribersNamespace[event];
    }
  }

  public channel(channel: string): SubscribeNodeImpl<any> {
    if (!channel) {
      throw new Error('not use empty channel');
    }
    const newRoots = findChannelNamespaces(channel, this.__roots);

    return new SubscriberNode({
      name: this.name ? `${this.name}__channel_${channel}` : undefined,
      roots: newRoots,
    });
  }

  public asReadonly(): SubscribeReadonlyNode<EVENTS> {
    return createSubscribeReadonlyNode(this);
  }

  public on(type: string, callback: (...args: any[]) => void): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const unsubscribers: Array<SubscriberRootsMap> = [];

    const subscribers = getSubscribers(type, Object.keys(this.__roots));

    for (const { namespace, event } of subscribers) {
      if (
        this.__subscribers[namespace] &&
        this.__subscribers[namespace][event] &&
        this.__subscribers[namespace][event].has(callback)
      )
        continue;

      const subscriberInfo: SubscriberInfo = {
        mode: 'on',
        roots: new Map(),
      };
      unsubscribers.push(subscriberInfo.roots);

      const action =
        namespace === ''
          ? callback
          : (type: string, ...other: any[]): void => {
              const namespacedEvent = `${namespace}:${type}`;
              callback(namespacedEvent, ...other);
            };

      if (this.__subscribers[namespace]) {
        if (this.__subscribers[namespace][event]) {
          this.__subscribers[namespace][event].set(callback, subscriberInfo);
        } else {
          const newMap = new Map();
          newMap.set(callback, subscriberInfo);
          this.__subscribers[namespace][event] = newMap;
        }
      } else {
        const newMap = new Map();
        newMap.set(callback, subscriberInfo);
        this.__subscribers[namespace] = { [event]: newMap };
      }

      if (this.__roots[namespace]) {
        const roots = this.__roots[namespace];
        for (const root of roots) {
          subscriberInfo.roots.set(root, root.on(event, action));
        }
      }
    }

    return () => {
      for (const unsubscriber of unsubscribers) {
        for (const item of unsubscriber) {
          item[1]();
        }
      }
    };
  }

  public once(type: string, callback: (...args: any[]) => void): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const subscribers = getSubscribers(type, Object.keys(this.__roots));

    let unscubscribers: Record<Namespace, SubscriberRootsMap> = {};

    for (const { namespace, event } of subscribers) {
      if (
        this.__subscribers[namespace] &&
        this.__subscribers[namespace][event] &&
        this.__subscribers[namespace][event].has(callback)
      )
        continue;

      const subscriberInfo: SubscriberInfo = {
        mode: 'once',
        roots: new Map(),
      };

      if (this.__subscribers[namespace]) {
        if (this.__subscribers[namespace][event]) {
          this.__subscribers[namespace][event].set(callback, subscriberInfo);
        } else {
          const newMap = new Map();
          newMap.set(callback, subscriberInfo);
          this.__subscribers[namespace][event] = newMap;
        }
      } else {
        const newMap = new Map();
        newMap.set(callback, subscriberInfo);
        this.__subscribers[namespace] = { [event]: newMap };
      }

      if (!this.__roots[namespace]) continue;

      const roots = this.__roots[namespace];
      if (!roots.length) continue;

      const subscribersNamespace = this.__subscribers[namespace];
      if (!subscribersNamespace) {
        this.__subscribers[namespace] = {};
      }

      unscubscribers[namespace] = subscriberInfo.roots;

      for (const root of roots) {
        const action = (type: string, ...other: any[]): void => {
          const namespacedEvent = namespace ? `${namespace}:${type}` : type;
          callback(namespacedEvent, ...other);

          subscriberInfo.roots.delete(root);
          if (!subscriberInfo.roots.size) {
            delete unscubscribers[namespace];
          }
        };

        subscriberInfo.roots.set(root, root.once(event, action));
      }
    }

    return () => {
      for (const namespace in unscubscribers) {
        const unsubscribersMap = unscubscribers[namespace];
        delete unscubscribers[namespace];
        if (!unsubscribersMap || !unsubscribersMap.size) continue;

        for (const item of unsubscribersMap) {
          item[1]();
        }
        unsubscribersMap.clear();
      }

      unscubscribers = {};
    };
  }

  public off(type: string, callback: (...args: any[]) => void): void {
    if (this.isDestroyed) return;

    const subscribers = getSubscribers(type, Object.keys(this.__roots));
    for (const { namespace, event } of subscribers) {
      if (!this.__subscribers[namespace]) continue;
      if (!this.__subscribers[namespace][event]) continue;
      if (!this.__subscribers[namespace][event].has(callback)) continue;

      const subscribersEvent = this.__subscribers[namespace][event];
      if (!subscribersEvent.size) continue;

      const subscriberInfo = subscribersEvent.get(callback);
      if (!subscriberInfo) continue;
      subscribersEvent.delete(callback);
      if (!subscribersEvent.size) {
        delete this.__subscribers[namespace][event];
      }

      for (const item of subscriberInfo.roots) {
        item[1]();
      }
      subscriberInfo.roots.clear();
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    for (const destroySubscriberNamespace in this.__destroySubscribers) {
      const unsubscribers =
        this.__destroySubscribers[destroySubscriberNamespace];
      for (const unsubscriber of unsubscribers) {
        unsubscriber[1]();
      }
      unsubscribers.clear();
    }
    this.__destroySubscribers = {};

    setTimeout(() => {
      for (const namespace in this.__subscribers) {
        const events = this.__subscribers[namespace];
        const roots = this.__roots[namespace];
        if (!roots || !roots.length) continue;
        if (!events.length) continue;

        for (const event in events) {
          const subscribers = events[event];
          for (const item of subscribers) {
            for (const unsubscribe of item[1].roots) {
              unsubscribe[1]();
            }
            item[1].roots.clear();
          }
          subscribers.clear();
        }

        this.__subscribers[namespace] = {};
      }

      this.__subscribers = {};
      this.__roots = {};
    }, 0);
  }
}
