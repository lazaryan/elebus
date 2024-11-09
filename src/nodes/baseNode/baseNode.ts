import { Transport } from '../../transport';
import {
  EventLike,
  NodeImpl,
  TransportRootImpl,
  Unscubscriber,
} from '../../types';
import { noopFunction } from '../../utils';

import { getSubscriberId, getSubscribers } from './utils';

type MergeNamespaceAndTypeName<
  NAMESPACE extends string,
  TYPE extends string,
> = NAMESPACE extends '' ? TYPE : `${NAMESPACE}:${TYPE}`;

type ExtractSubNamespace<
  STR extends string,
  NAMESPACE extends string,
> = STR extends `${NAMESPACE}:${infer TYPE}` ? TYPE : STR;

export type BaseNodeChildren<NAMESPACES extends string> = Map<
  NAMESPACES,
  Set<TransportRootImpl>
>;

export type BaseNodeChildrenObject<NAMESPACES extends string> = Record<
  NAMESPACES,
  Set<TransportRootImpl>
>;

export type BaseNodeProps<NAMESPACES extends string> = {
  children?: BaseNodeChildren<NAMESPACES>;
};

type SubscribeEvent = string; // namespace:event

type Subscriber = {
  id: SubscribeEvent;
  subscribers: Set<() => void>;
  unsubscribe: () => void;
};

type Subscribers = Map<SubscribeEvent, Subscriber>;

export class BaseNode<EVENTS extends EventLike, NAMESPACES extends string = ''>
  implements NodeImpl
{
  private __roots: BaseNodeChildren<NAMESPACES> = new Map();

  private __subscribers: Subscribers = new Map();
  private __subscribersOnce: Subscribers = new Map();
  private __isDestroyed = false;

  constructor(props?: BaseNodeProps<NAMESPACES>) {
    this.__roots = props?.children ?? new Map();
  }

  private __subscribe<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
    EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(
    mode: 'on' | 'once',
    type: EVENT_TYPE,
    callback: (...args: CB[EVENT]) => void,
  ): Unscubscriber {
    if (this.__isDestroyed) return noopFunction;

    let activeSubscribers: Subscriber[] = [];

    const store = mode === 'on' ? this.__subscribers : this.__subscribersOnce;

    getSubscribers(type, [...this.__roots.keys()]).forEach(
      ({ namespace, events }) => {
        const transports = this.__roots.get(namespace);
        if (!transports || !transports.size) return;

        events.forEach((event) => {
          const subscribeId = getSubscriberId(namespace, event);
          const subscriber = store.get(subscribeId);

          if (subscriber) {
            subscriber.subscribers.add(callback);
            activeSubscribers.push(subscriber);
          } else {
            const subscribers: Set<(...args: any[]) => void> = new Set([
              callback,
            ]);
            let unscubscribers: Array<Unscubscriber> = [];

            function unsubscribe(): void {
              subscribers.clear();
              unscubscribers.forEach((unscubscriber) => unscubscriber());
              unscubscribers = [];
            }

            if (mode === 'on') {
              function subscribe(type: string, ...args: any[]): void {
                const event = namespace ? `${namespace}:${type}` : type;
                subscribers.forEach((subscriber) => subscriber(event, ...args));
              }

              transports.forEach((transport) =>
                unscubscribers.push(transport.on(event, subscribe)),
              );
            } else {
              function subscribe(type: string, ...args: any[]): void {
                const event = namespace ? `${namespace}:${type}` : type;
                subscribers.forEach((subscriber) => subscriber(event, ...args));

                subscribers.delete(callback);
                if (!subscribers.size) {
                  unsubscribe();
                }
              }

              transports.forEach((transport) =>
                unscubscribers.push(transport.on(event, subscribe)),
              );
            }

            const newSubscriber: Subscriber = {
              id: subscribeId,
              subscribers,
              unsubscribe,
            };

            activeSubscribers.push(newSubscriber);
            store.set(subscribeId, newSubscriber);
          }
        });
      },
    );

    return () => {
      activeSubscribers.forEach((subscriber) => {
        subscriber.subscribers.delete(callback);
        if (!subscriber.subscribers.size) {
          subscriber.unsubscribe();
          store.delete(subscriber.id);
        }
      });
      activeSubscribers = [];
    };
  }

  private __unsubscribe<EVENT_TYPE extends string & (keyof EVENTS | '*')>(
    type: EVENT_TYPE,
    callback: (...args: any[]) => void,
  ): void {
    if (this.__isDestroyed) return;

    getSubscribers(type, [...this.__roots.keys()]).forEach(
      ({ namespace, events }) => {
        events.forEach((event) => {
          const subscribeId = getSubscriberId(namespace, event);

          const subscriber = this.__subscribers.get(subscribeId);
          const subscriberOnce = this.__subscribersOnce.get(subscribeId);

          if (subscriber) {
            subscriber.subscribers.delete(callback);
            if (!subscriber.subscribers.size) {
              subscriber.unsubscribe();
              this.__subscribers.delete(subscriber.id);
            }
          }

          if (subscriberOnce) {
            subscriberOnce.subscribers.delete(callback);
            if (!subscriberOnce.subscribers.size) {
              subscriberOnce.unsubscribe();
              this.__subscribersOnce.delete(subscriberOnce.id);
            }
          }
        });
      },
    );
  }

  public get isDestroyed() {
    return this.__isDestroyed;
  }

  public watch<
    TRANSPORT_EVENTS extends EventLike,
    TRANSPORT_EVENTS_TYPES extends string & keyof TRANSPORT_EVENTS,
    TRANSPORT_NAMESPACES extends string,
    NEW_NAMESPACE extends string,
    NEW_EVENTS extends EVENTS & {
      [KEY in MergeNamespaceAndTypeName<
        NEW_NAMESPACE,
        TRANSPORT_EVENTS_TYPES
      >]: TRANSPORT_EVENTS[ExtractSubNamespace<KEY, NEW_NAMESPACE>];
    },
  >(
    transport:
      | Transport<TRANSPORT_EVENTS>
      | BaseNode<TRANSPORT_EVENTS, TRANSPORT_NAMESPACES>,
    namespace: NEW_NAMESPACE,
  ): BaseNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACE> {
    const newList: BaseNodeChildren<NAMESPACES | NEW_NAMESPACE> = new Map(
      this.__roots,
    );

    if (transport instanceof Transport) {
      const children = newList.get(namespace);
      if (children) {
        children.add(transport);
      } else {
        newList.set(namespace, new Set([transport]));
      }

      return new BaseNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACE>({
        children: newList,
      });
    }

    const newNamespaces = transport.getWatchedTransports();
    newNamespaces.forEach((newTransports, oldNamespace) => {
      const newNamespace = oldNamespace
        ? `${namespace}:${oldNamespace}`
        : namespace;
      const savedTransports = newList.get(newNamespace as NEW_NAMESPACE);

      if (savedTransports) {
        newTransports.forEach((transport) => {
          if (!savedTransports.has(transport)) {
            savedTransports.add(transport);
          }
        });
      } else {
        newList.set(namespace, new Set(newTransports));
      }
    });

    return new BaseNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACE>({
      children: newList,
    });
  }

  public watchTransports<
    NEW_EVENTS extends EventLike,
    NEW_NAMESPACES extends string,
  >(
    transports:
      | BaseNodeChildren<NEW_NAMESPACES>
      | BaseNodeChildrenObject<NEW_NAMESPACES>,
  ): BaseNode<EVENTS & NEW_EVENTS, NAMESPACES | NEW_NAMESPACES> {
    const newList: BaseNodeChildren<NAMESPACES | NEW_NAMESPACES> = new Map(
      this.__roots,
    );

    if (transports instanceof Map) {
      transports.forEach((newTransports, namespace) => {
        const savedTransports = newList.get(namespace);
        if (savedTransports) {
          newTransports.forEach((transport) => {
            if (!savedTransports.has(transport)) {
              savedTransports.add(transport);
            }
          });
        } else {
          newList.set(namespace, new Set(newTransports));
        }
      });
    } else {
      Object.entries<Set<TransportRootImpl>>(transports).forEach(
        ([namespace, newTransports]) => {
          const savedTransports = newList.get(namespace as NEW_NAMESPACES);
          if (savedTransports) {
            newTransports.forEach((transport) => {
              if (!savedTransports.has(transport)) {
                savedTransports.add(transport);
              }
            });
          } else {
            newList.set(namespace as NEW_NAMESPACES, new Set(newTransports));
          }
        },
      );
    }

    return new BaseNode<EVENTS & NEW_EVENTS, NAMESPACES | NEW_NAMESPACES>({
      children: newList,
    });
  }

  public getWatchedTransports(): Readonly<BaseNodeChildren<NAMESPACES>> {
    return this.__roots;
  }

  public on = this.__subscribe.bind(this, 'on');
  public once = this.__subscribe.bind(this, 'once');
  public off = this.__unsubscribe;

  public addEventListener = this.on;
  public removeEventListener = this.off;

  public subscribe = this.on;
  public unscubscribe = this.off;

  public destroy(): void {
    if (this.__isDestroyed) return;
    this.__isDestroyed = true;

    this.__subscribers.forEach((subscriber) => subscriber.unsubscribe());
    this.__subscribersOnce.forEach((subscriber) => subscriber.unsubscribe());

    this.__subscribers.clear();
    this.__subscribersOnce.clear();
  }
}
