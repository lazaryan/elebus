import type { SubscribeNodeSubscribers, TransportNodeBase } from '../nodeTypes';
import type { TransportRoot } from '../transport';
import type {
  BaseTransportNode,
  BaseTransportNodeReadonly,
  EventLike,
} from '../types';
import type {
  UtilsTypeFilterTypesWithNamespaces,
  UtilsTypeRemoveNamespaceFromType,
} from '../typeUtils';

export type Namespace = string;
export type Type = string;
export type OptionsRoots = Record<Namespace, Array<AllNodeTypes>>;

export type AllNodeTypes =
  | TransportRoot<any>
  | BaseTransportNode
  | BaseTransportNodeReadonly;

export type SubscribeNodeOptions = {
  name?: string;
  roots: OptionsRoots;
};

export interface SubscribeNode<EVENTS extends EventLike>
  extends TransportNodeBase<EVENTS> {
  add<
    TYPES extends string & keyof EVENTS,
    TYPE extends Type,
    ALL_NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<TYPES, TYPE>,
  >(
    namespace: ALL_NAMESPACES | '',
    root: AllNodeTypes,
  ): void;
  remove<
    TYPES extends string & keyof EVENTS,
    TYPE extends Type,
    ALL_NAMESPACES extends UtilsTypeFilterTypesWithNamespaces<TYPES, TYPE>,
  >(
    namespace: ALL_NAMESPACES | '',
    root: AllNodeTypes,
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

type SubscribeReadonlyNodeExtends<EVENTS extends EventLike> =
  BaseTransportNodeReadonly & SubscribeNodeSubscribers<EVENTS>;

export interface SubscribeReadonlyNode<EVENTS extends EventLike>
  extends SubscribeReadonlyNodeExtends<EVENTS> {}
