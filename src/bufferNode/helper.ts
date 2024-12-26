import { EventLike } from '../types';

import { BufferNode as BufferNodeClass } from './bufferNode';
import { AllowedNodes, BufferNode } from './types';

export function createBufferNode<EVENTS extends EventLike>(
  node: AllowedNodes<EVENTS>,
  timeout: number,
): BufferNode<EVENTS> {
  return new BufferNodeClass<EVENTS>(node, timeout);
}
