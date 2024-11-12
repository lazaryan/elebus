import { Transport } from '../transport/transport';
import {
  EventLike,
  NodeImpl,
  TransportRootImpl,
  Unscubscriber,
} from '../types';
import { noopFunction } from '../utils';

import {
  ExtractSubNamespace,
  FilterTypeWithNamespace,
  MergeNamespaceAndTypeName,
} from './typeUtils';
import { getSubscriberId, getSubscribers } from './utils';

export type TransportNodeChildren<NAMESPACES extends string> = Map<
  NAMESPACES,
  Set<TransportRootImpl>
>;

export type TransportNodeChildrenObject<NAMESPACES extends string> = Record<
  NAMESPACES,
  Set<TransportRootImpl>
>;

export type TransportNodeProps<NAMESPACES extends string> = {
  children?: TransportNodeChildren<NAMESPACES>;
  name?: string;
};

type SubscribeEvent = string; // namespace:event

type Subscriber = {
  id: SubscribeEvent;
  subscribers: Set<() => void>;
  unsubscribe: () => void;
};

type Subscribers = Map<SubscribeEvent, Subscriber>;

export class TransportNode<
  EVENTS extends EventLike = {},
  NAMESPACES extends string = '',
> implements NodeImpl
{
  /**
   * @internal
   */
  private __roots: TransportNodeChildren<NAMESPACES> = new Map();

  /**
   * @internal
   */
  private __subscribers: Subscribers = new Map();
  /**
   * @internal
   */
  private __subscribersOnce: Subscribers = new Map();

  public name: string | undefined;
  public isDestroyed: boolean = false;

  constructor(props?: TransportNodeProps<NAMESPACES>) {
    this.__roots = props?.children ?? new Map();

    this.name = props?.name;

    if (this.__roots.size) {
      const unsubscribers: Set<Unscubscriber> = new Set();

      this.__roots.forEach((transports, namespace) => {
        transports.forEach((transport) => {
          const unsubscriber = transport.once('___elebus_root_destroy', () => {
            transports.delete(transport);
            unsubscribers.delete(unsubscriber);
            if (!transports.size) {
              this.__roots.delete(namespace);

              if (!this.__roots.size) {
                this.destroy();
              }
            }
          });
          unsubscribers.add(unsubscriber);
        });
      });

      const unsubscribe = () => {
        unsubscribers.forEach((unsubscriber) => unsubscriber());
      };

      this.__subscribersOnce.set('___elebus_root_destroy', {
        id: '___elebus_root_destroy',
        subscribers: new Set(),
        unsubscribe,
      });
    }
  }

  /**
   * @internal
   */
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
    if (this.isDestroyed) return noopFunction;

    let activeSubscribers: Subscriber[] = [];

    const store = mode === 'on' ? this.__subscribers : this.__subscribersOnce;

    getSubscribers(type, [...this.__roots.keys()]).forEach(
      ({ namespace, event }) => {
        const transports = this.__roots.get(namespace);
        if (!transports || !transports.size) return;

        const subscribeId = getSubscriberId(namespace, event);
        const subscriber = store.get(subscribeId);

        if (subscriber) {
          subscriber.subscribers.add(callback);
          activeSubscribers.push(subscriber);
          return;
        }

        const subscribers: Set<(...args: any[]) => void> = new Set([callback]);
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

  /**
   * @internal
   */
  private __unsubscribe<EVENT_TYPE extends string & (keyof EVENTS | '*')>(
    type: EVENT_TYPE,
    callback: (...args: any[]) => void,
  ): void {
    if (this.isDestroyed) return;

    getSubscribers(type, [...this.__roots.keys()]).forEach(
      ({ namespace, event }) => {
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
      },
    );
  }

  public as<
    EVENTS extends EventLike,
    NAMESPACES extends string = '',
  >(): TransportNode<EVENTS, NAMESPACES> {
    return this as unknown as TransportNode<EVENTS, NAMESPACES>;
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
      | TransportNode<TRANSPORT_EVENTS, TRANSPORT_NAMESPACES>,
    namespace: NEW_NAMESPACE,
  ): TransportNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACE> {
    const newList: TransportNodeChildren<NAMESPACES | NEW_NAMESPACE> = new Map(
      this.__roots,
    );

    if (transport instanceof Transport) {
      const children = newList.get(namespace);
      if (children) {
        children.add(transport);
      } else {
        newList.set(namespace, new Set([transport]));
      }

      return new TransportNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACE>({
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

    return new TransportNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACE>({
      children: newList,
    });
  }

  public watchTransports<
    NEW_EVENTS extends EventLike,
    NEW_NAMESPACES extends string,
  >(
    transports:
      | TransportNodeChildren<NEW_NAMESPACES>
      | TransportNodeChildrenObject<NEW_NAMESPACES>,
  ): TransportNode<EVENTS & NEW_EVENTS, NAMESPACES | NEW_NAMESPACES> {
    const newList: TransportNodeChildren<NAMESPACES | NEW_NAMESPACES> = new Map(
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

    return new TransportNode<EVENTS & NEW_EVENTS, NAMESPACES | NEW_NAMESPACES>({
      children: newList,
    });
  }

  public channel<
    NAMESPACE extends string & NAMESPACES,
    OLD_EVENTS_KEYS extends string & keyof EVENTS,
    NEW_TEST extends string,
    OLD_EVENTS_WITH_NAMESPACE extends FilterTypeWithNamespace<
      OLD_EVENTS_KEYS,
      NEW_TEST
    >,
    NEW_EVENTS extends {
      [KEY in OLD_EVENTS_WITH_NAMESPACE]: EVENTS[MergeNamespaceAndTypeName<
        NAMESPACE,
        KEY
      >];
    },
  >(channel: NAMESPACE): TransportNode<NEW_EVENTS, ''> {
    const nodes = this.__roots.get(channel);

    if (!nodes) {
      return new TransportNode();
    }

    const list = new Map();
    list.set('', nodes);

    return new TransportNode({ children: list });
  }

  public getWatchedTransports(): Readonly<TransportNodeChildren<NAMESPACES>> {
    return this.__roots;
  }

  public on = this.__subscribe.bind(this, 'on');
  public once = this.__subscribe.bind(this, 'once');
  public off = this.__unsubscribe;

  public addEventListener = this.on;
  public removeEventListener = this.off;

  /**
   * Method of destroying node.
   * After this, subscription and sending events will not work,
   * and all data will be cleared.
   */
  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.__subscribers.forEach((subscriber) => subscriber.unsubscribe());
    this.__subscribersOnce.forEach((subscriber) => subscriber.unsubscribe());

    this.__subscribers.clear();
    this.__subscribersOnce.clear();
  }
}
