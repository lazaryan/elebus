import { type EventLike } from '../types';

import { TransportNode, type TransportNodeProps } from './node';

export function createNode<
  EVENTS extends EventLike,
  NAMESPACES extends string = '',
>(props?: TransportNodeProps<NAMESPACES>): TransportNode<EVENTS, NAMESPACES> {
  return new TransportNode<EVENTS, NAMESPACES>(props);
}
