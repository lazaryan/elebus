import type { TransportRoot } from '../transport';
import type { EventLike } from '../types';

import { TransportReadonlyNode as TransportReadonlyNodeClass } from './transportReadonlyNode';
import type { TransportReadonlyNode } from './types';

/**
 * Helper for create transport node
 */
export function createTransportReadonlyNode<T extends EventLike>(
  root: TransportRoot<T>,
): TransportReadonlyNode<T> {
  return new TransportReadonlyNodeClass<T>(root);
}
