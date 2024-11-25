import type { TransportRoot, TransportRootSubscribers } from '../transport';
import type { BaseTransportNode, EventLike } from '../types';

type TransportReadonlyNodeExtends<EVENTS extends EventLike> =
  BaseTransportNode & TransportRootSubscribers<EVENTS>;

export interface TransportReadonlyNode<EVENTS extends EventLike>
  extends TransportReadonlyNodeExtends<EVENTS> {
  name?: string;

  lifecycle: TransportRoot<EVENTS>['lifecycle'];
}
