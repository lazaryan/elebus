import type { SubscribeNode } from '../subscribeNode';
import type { EventLike } from '../types';

import { SubscribeReadonlyNode as SubscribeReadonlyNodeClass } from './subscribeReadonlyNode';
import type { SubscribeReadonlyNode } from './types';

/**
 * Helper for create transport node
 */
export function createSubscribeReadonlyNode<T extends EventLike>(
  node: SubscribeNode<T>,
): SubscribeReadonlyNode<T> {
  return new SubscribeReadonlyNodeClass<T>(node);
}
