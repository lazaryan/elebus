import type { SubscribeNodeSubscribers } from '../subscribeNode';
import type { BaseTransportNode, EventLike } from '../types';

type SubscribeReadonlyNodeExtends<EVENTS extends EventLike> =
  BaseTransportNode & SubscribeNodeSubscribers<EVENTS>;

export interface SubscribeReadonlyNode<EVENTS extends EventLike>
  extends SubscribeReadonlyNodeExtends<EVENTS> {
  name?: string;
}
