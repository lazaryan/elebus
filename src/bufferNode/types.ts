import type { TransportNodeBaseReadonly } from '../nodeTypes';
import type { TransportRootBase } from '../rootTypes';
import type { TransportRoot } from '../transport';
import type { EventLike } from '../types';

export type AllowedNodes<EVENTS extends EventLike> =
  | TransportRoot<EVENTS>
  | TransportNodeBaseReadonly<EVENTS>;

export type BufferEvents<EVENTS extends EventLike> = {
  [TYPE in keyof EVENTS]: Array<EVENTS[TYPE]>;
};

export interface BufferNode<EVENTS extends EventLike>
  extends TransportRootBase<BufferEvents<EVENTS>> {}
