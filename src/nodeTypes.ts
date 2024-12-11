import type { BaseTransportNode, EventLike, Unsubscriber } from './types';
import type {
  UtilsTypeFilterTypesWithNamespaces,
  UtilsTypeRemoveNamespaceFromType,
} from './typeUtils';

export interface SubscribeNodeSubscribers<EVENTS extends EventLike> {
  on<
    EVENTS_KEYS extends keyof EVENTS,
    TYPE extends string,
    NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<
      string & EVENTS_KEYS,
      TYPE
    >,
    EVENT_TYPE extends `${NAMESPACES}:*` | '*' | (string & EVENTS_KEYS),
    NEW_NAMESPACE extends UtilsTypeFilterTypesWithNamespaces<EVENT_TYPE, TYPE>,
    CALLBACK_EVENTS extends EVENT_TYPE extends '*'
      ? string & EVENTS_KEYS
      : EVENT_TYPE extends `${NAMESPACES}:*`
        ? UtilsTypeRemoveNamespaceFromType<string & EVENTS_KEYS, NEW_NAMESPACE>
        : EVENT_TYPE,
    CALLBACK_PARAMS extends {
      [TYPE in CALLBACK_EVENTS]: [event: TYPE, payload: EVENTS[TYPE]];
    },
  >(
    event: EVENT_TYPE,
    callback: (...args: CALLBACK_PARAMS[CALLBACK_EVENTS]) => void,
  ): Unsubscriber;

  once<
    EVENTS_KEYS extends keyof EVENTS,
    TYPE extends string,
    NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<
      string & EVENTS_KEYS,
      TYPE
    >,
    EVENT_TYPE extends `${NAMESPACES}:*` | '*' | (string & EVENTS_KEYS),
    NEW_NAMESPACE extends UtilsTypeFilterTypesWithNamespaces<EVENT_TYPE, TYPE>,
    CALLBACK_EVENTS extends EVENT_TYPE extends '*'
      ? string & EVENTS_KEYS
      : EVENT_TYPE extends `${NAMESPACES}:*`
        ? UtilsTypeRemoveNamespaceFromType<string & EVENTS_KEYS, NEW_NAMESPACE>
        : EVENT_TYPE,
    CALLBACK_PARAMS extends {
      [TYPE in CALLBACK_EVENTS]: [event: TYPE, payload: EVENTS[TYPE]];
    },
  >(
    event: EVENT_TYPE,
    callback: (...args: CALLBACK_PARAMS[CALLBACK_EVENTS]) => void,
  ): Unsubscriber;

  off<
    EVENTS_KEYS extends keyof EVENTS,
    TYPE extends string,
    NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<
      string & EVENTS_KEYS,
      TYPE
    >,
    EVENT_TYPE extends `${NAMESPACES}:*` | '*' | (string & EVENTS_KEYS),
  >(
    type: EVENT_TYPE,
    callback: (...args: any[]) => void,
  ): void;
}

export type TransportNodeBase<EVENTS extends EventLike> =
  SubscribeNodeSubscribers<EVENTS> & BaseTransportNode;
