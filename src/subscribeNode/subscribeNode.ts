import type { TransportRoot } from '../transport';
import type {
  AnyFunction,
  EventLike,
  TransportRootNodes,
  Unsubscriber,
} from '../types';
import { noopFunction } from '../utils';

import { createSubscribeReadonlyNode } from './subscribeNodeReadonly';
import type {
  AllNodeTypes,
  Namespace,
  SubscribeNode as SubscribeNodeImpl,
  SubscribeNodeOptions,
  SubscribeReadonlyNode,
  Type,
} from './types';
import {
  findChannelNamespaces,
  getSubscribers,
  parseOptionsRoots,
} from './utils';

type Subsciber = (...args: any[]) => void;

type SubscriberRootsMap = Map<TransportRoot<any>, Unsubscriber>;

type SubscriberInfo = {
  mode: 'on' | 'once';
  roots: SubscriberRootsMap;
};

type SubscribersTypesMap = Map<Subsciber, SubscriberInfo>;

type SubscribersTypes = Record<Type, SubscribersTypesMap>;

type SubscribersNamespaces = Record<Namespace, SubscribersTypes>;

type DestroySubscribers = Map<TransportRoot<any>, Unsubscriber>;

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

  public readonly __isRoot: Readonly<false> = false as const;

  public isDestroyed: boolean = false;
  public readonly name: string | undefined = undefined;

  constructor(options?: SubscribeNodeOptions) {
    if (options) {
      if (options.name) {
        this.name = options.name;
      }

      if (options.roots) {
        this.__roots = parseOptionsRoots(options.roots);

        setTimeout(() => {
          if (this.isDestroyed) return;

          for (const namespace in this.__roots) {
            const roots = this.__roots[namespace];

            const destroySubscribers = new Map();

            for (const root of roots) {
              if (root.isDestroyed) {
                const index = roots.indexOf(root);
                if (index === -1) continue;

                roots.splice(index, 1);
                if (!roots.length) {
                  delete this.__roots[namespace];
                }

                continue;
              }

              destroySubscribers.set(
                root,
                root.lifecycle.on('destroy', () =>
                  this.remove(namespace, root),
                ),
              );
            }

            if (destroySubscribers.size) {
              this.__destroySubscribers[namespace] = destroySubscribers;
            }
          }
        }, 0);
      }
    }
  }

  public getTransports = (): TransportRootNodes => {
    return this.__roots;
  };

  public add = (namespace: Namespace, node: AllNodeTypes): void => {
    if (node.isDestroyed) return;

    if (!node.__isRoot) {
      const roots = node.getTransports();
      for (const rootNamesapce in roots) {
        const namespacedRoots = roots[rootNamesapce];
        const resultNamespace =
          namespace === '' ? rootNamesapce : `${namespace}:${rootNamesapce}`;
        for (const root of namespacedRoots) {
          this.add(resultNamespace, root);
        }
      }
      return;
    }

    if (this.__roots[namespace]) {
      if (this.__roots[namespace].includes(node)) return;
      this.__roots[namespace].push(node);
    } else {
      this.__roots[namespace] = [node];
    }

    let destroySubscribers = this.__destroySubscribers[namespace];
    if (!destroySubscribers) {
      destroySubscribers = new Map();
      this.__destroySubscribers[namespace] = destroySubscribers;
    }

    if (!destroySubscribers.has(node)) {
      destroySubscribers.set(
        node,
        node.lifecycle.on('destroy', () => this.remove(namespace, node)),
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

          roots.set(node, node.on(event, action));
        } else {
          const action =
            namespace === ''
              ? (type: string, ...args: any[]): void => {
                  callback(type, ...args);
                  roots.delete(node);
                }
              : (type: string, ...args: any[]): void => {
                  const event = `${namespace}:${type}`;
                  callback(event, ...args);
                  roots.delete(node);
                };

          roots.set(node, node.once(event, action));
        }
      }
    }
  };

  public remove = (namespace: Namespace, node: AllNodeTypes): void => {
    if (!node.__isRoot) {
      const roots = node.getTransports();
      for (const rootNamesapce in roots) {
        const namespacedRoots = roots[rootNamesapce];
        const resultNamespace =
          namespace === '' ? rootNamesapce : `${namespace}:${rootNamesapce}`;
        for (const root of namespacedRoots) {
          this.remove(resultNamespace, root);
        }
      }
      return;
    }

    const roots = this.__roots[namespace];
    if (!roots || !roots.includes(node)) return;

    const destroySubscribers = this.__destroySubscribers[namespace];
    if (destroySubscribers) {
      if (destroySubscribers.has(node)) {
        destroySubscribers.get(node)?.();
        destroySubscribers.delete(node);

        if (!destroySubscribers.size) {
          delete this.__destroySubscribers[namespace];
        }
      }
    }

    const index = roots.indexOf(node);
    if (index === -1) return;
    roots.splice(index, 1);
    if (!roots.length) {
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
        if (!roots.has(node)) continue;
        roots.get(node)?.();
        roots.delete(node);
      }

      if (!subscribers.size) {
        clearedEvents.push(event);
      }
    }

    for (const event of clearedEvents) {
      delete subscribersNamespace[event];
    }
  };

  public channel = (channel: string): SubscribeNodeImpl<any> => {
    if (!channel) {
      throw new Error('not use empty channel');
    }
    const newRoots = findChannelNamespaces(channel, this.__roots);

    return new SubscriberNode({
      name: this.name ? `${this.name}__channel_${channel}` : undefined,
      roots: newRoots,
    });
  };

  public asReadonly = (): SubscribeReadonlyNode<EVENTS> => {
    return createSubscribeReadonlyNode(this);
  };

  public on = (type: string, callback: AnyFunction): Unsubscriber => {
    if (this.isDestroyed) return noopFunction;

    const unsubscribers: Array<SubscriberRootsMap> = [];

    const subscribers = getSubscribers(type, Object.keys(this.__roots));

    for (const { namespace, event } of subscribers) {
      if (this.__subscribers[namespace]?.[event]?.has(callback)) {
        const info = this.__subscribers[namespace]?.[event].get(callback);
        if (info) {
          unsubscribers.push(info.roots);
        }
        continue;
      }

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

      const roots = this.__roots[namespace];
      if (roots) {
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
  };

  public once = (type: string, callback: AnyFunction): Unsubscriber => {
    if (this.isDestroyed) return noopFunction;

    const subscribers = getSubscribers(type, Object.keys(this.__roots));

    let unsubscribers: Record<Namespace, SubscriberRootsMap> = {};

    for (const { namespace, event } of subscribers) {
      if (this.__subscribers[namespace]?.[event]?.has(callback)) {
        const info = this.__subscribers[namespace]?.[event].get(callback);
        if (info) {
          unsubscribers[namespace] = info.roots;
        }
        continue;
      }

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

      const roots = this.__roots[namespace];
      if (!roots || !roots.length) continue;

      const subscribersNamespace = this.__subscribers[namespace];
      if (!subscribersNamespace) {
        this.__subscribers[namespace] = {};
      }

      unsubscribers[namespace] = subscriberInfo.roots;

      for (const root of roots) {
        const action = (type: string, ...other: any[]): void => {
          const namespacedEvent = namespace ? `${namespace}:${type}` : type;
          callback(namespacedEvent, ...other);

          subscriberInfo.roots.delete(root);
          if (!subscriberInfo.roots.size) {
            delete unsubscribers[namespace];
          }
        };

        subscriberInfo.roots.set(root, root.once(event, action));
      }
    }

    return () => {
      for (const namespace in unsubscribers) {
        const unsubscribersMap = unsubscribers[namespace];
        delete unsubscribers[namespace];
        if (!unsubscribersMap || !unsubscribersMap.size) continue;

        for (const item of unsubscribersMap) {
          item[1]();
        }
        unsubscribersMap.clear();
      }

      unsubscribers = {};
    };
  };

  public off = (type: string, callback: AnyFunction): void => {
    if (this.isDestroyed) return;

    const subscribers = getSubscribers(type, Object.keys(this.__roots));
    for (const { namespace, event } of subscribers) {
      if (!this.__subscribers[namespace]?.[event]?.has(callback)) continue;

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
  };

  public destroy = (): void => {
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
  };
}
