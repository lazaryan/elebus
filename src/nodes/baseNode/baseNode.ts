import { EventLike, Unscubscriber, TransportRootImpl } from '../../types';
import { Transport } from '../../transport';

import { TransportNodeImpl } from '../types';
import { getSubscribers } from './utils';

type MergeNamespaceAndTypeName<
  NAMESPACE extends string,
  TYPE extends string,
> = NAMESPACE extends '' ? TYPE : `${NAMESPACE}:${TYPE}`;

type ExtractSubNamespace<
  STR extends string,
  NAMESPACE extends string,
> = STR extends `${NAMESPACE}:${infer TYPE}` ? TYPE : STR;

type TransportNodeChildren<NAMESPACES extends string> = Map<
  NAMESPACES,
  Set<TransportRootImpl>
>;

type TransportNodeChildrenObject<NAMESPACES extends string> = Record<
  NAMESPACES,
  Set<TransportRootImpl>
>;

type TransportNodeProps<NAMESPACES extends string> = {
  children?: TransportNodeChildren<NAMESPACES>;
};

type Subscribers<NAMESPACES extends string> = Map<
  NAMESPACES,
  {
    subscriber: (...args: any[]) => void;
    subscribers: Set<(...args: any[]) => void>;
  }
>;

export class BaseNode<EVENTS extends EventLike, NAMESPACES extends string = ''>
  implements TransportNodeImpl
{
  private __children: TransportNodeChildren<NAMESPACES> = new Map();
  private __subscribers: Subscribers<NAMESPACES> = new Map();

  constructor(props?: TransportNodeProps<NAMESPACES>) {
    this.__children = props?.children ?? new Map();
  }

  public getWatchedTransports(): Readonly<TransportNodeChildren<NAMESPACES>> {
    return this.__children;
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
    const newList: TransportNodeChildren<NAMESPACES | NEW_NAMESPACE> = new Map(
      this.__children,
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
      | TransportNodeChildren<NEW_NAMESPACES>
      | TransportNodeChildrenObject<NEW_NAMESPACES>,
  ): BaseNode<EVENTS & NEW_EVENTS, NAMESPACES | NEW_NAMESPACES> {
    const newList: TransportNodeChildren<NAMESPACES | NEW_NAMESPACES> = new Map(
      this.__children,
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

    return new BaseNode<NEW_EVENTS, NAMESPACES | NEW_NAMESPACES>({
      children: newList,
    });
  }

  private __subscribe<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
    EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(type: EVENT_TYPE, callback: (...args: CB[EVENT]) => void): Unscubscriber {
    let unsubscribers: Unscubscriber[] = [];

    getSubscribers(type, [...this.__children.keys()]).forEach(
      ({ namespace, events }) => {
        const transports = this.__children.get(namespace);

        if (namespace === '') {
          events.forEach((event) => {
            transports?.forEach((transport) =>
              unsubscribers.push(
                transport.on(
                  event,
                  callback as Parameters<typeof transport.on>[1],
                ),
              ),
            );
          });
        } else {
          events.forEach((event) => {
            const subscribers = this.__subscribers.get(namespace);

            if (subscribers) {
              subscribers.subscribers.add(callback);
            } else {
              const self = this;

              function subscriber(type: string, payload?: any) {
                const newEvent = `${namespace}:${type}`;

                self.__subscribers
                  .get(namespace)
                  ?.subscribers.forEach((callback) => {
                    callback(newEvent, payload);
                  });
              }

              transports?.forEach((transport) =>
                unsubscribers.push(transport.on(event, subscriber)),
              );
              this.__subscribers.set(namespace, {
                subscriber,
                subscribers: new Set([callback]),
              });
            }
          });
        }
      },
    );

    return () => {
      unsubscribers.forEach((unsubscriber) => unsubscriber());
      unsubscribers = [];
    };
  }

  public on = this.__subscribe;

  public destroy(): void {}
}
