import { EventLike } from '../../types';

import { BaseNode, BaseNodeProps } from './baseNode';

export function createBaseNode<
  EVENTS extends EventLike,
  NAMESPACES extends string = '',
>(props?: BaseNodeProps<NAMESPACES>): BaseNode<EVENTS, NAMESPACES> {
  return new BaseNode<EVENTS, NAMESPACES>(props);
}
