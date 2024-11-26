import type { SubscribeReadonlyNode } from '../subscribeReadonlyNode';
import type { TransportRoot } from '../transport';
import type { TransportReadonlyNode } from '../transportReadonlyNode';
import type {
  BaseTransportNode,
  DestroyedNode,
  EventLike,
  Unscubscriber,
} from '../types';
import type {
  UtilsTypeFilterTypesWithNamespaces,
  UtilsTypeRemoveNamespaceFromType,
} from '../typeUtils';

export type Namespace = string;
export type Type = string;
export type OptionsRoots = Record<Namespace, Array<AllNodeTypes>>;

type AllNodeTypes =
  | TransportRoot<any>
  | TransportReadonlyNode<any>
  | SubscribeNode<any>
  | SubscribeReadonlyNode<any>;

export type SubscribeNodeOptions = {
  name?: string;
  roots: OptionsRoots;
};

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
  ): Unscubscriber;

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
  ): Unscubscriber;

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

type SubscribeNodeBaseExtends<EVENTS extends EventLike> =
  SubscribeNodeSubscribers<EVENTS> & BaseTransportNode & DestroyedNode;

export interface SubscribeNode<EVENTS extends EventLike>
  extends SubscribeNodeBaseExtends<EVENTS> {
  name?: string;

  add<
    TYPES extends string & keyof EVENTS,
    TYPE extends Type,
    ALL_NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<TYPES, TYPE>,
  >(
    namespace: ALL_NAMESPACES | '',
    root: TransportRoot<any>,
  ): void;
  remove<
    TYPES extends string & keyof EVENTS,
    TYPE extends Type,
    ALL_NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<TYPES, TYPE>,
  >(
    namespace: ALL_NAMESPACES | '',
    root: TransportRoot<any>,
  ): void;
  channel<
    EVENT_TYPES extends string & keyof EVENTS,
    TYPES extends string,
    CHANNEL extends UtilsTypeFilterTypesWithNamespaces<EVENT_TYPES, TYPES>,
    CHANNEL_EVENTS_TYPES extends UtilsTypeRemoveNamespaceFromType<
      EVENT_TYPES,
      CHANNEL
    >,
    CHANNEL_EVENTS extends {
      [TYPE in CHANNEL_EVENTS_TYPES]: EVENTS[`${CHANNEL}:${TYPE}`];
    },
  >(
    channel: CHANNEL,
  ): SubscribeNode<CHANNEL_EVENTS>;

  asReadonly(): SubscribeReadonlyNode<EVENTS>;
}
