import { EventLike } from '../types';

import { SubscriberNode as SubscriberNodeClass } from './subscribeNode';
import { SubscribeNode, SubscribeNodeOptions } from './types';

export function createSubscribeNode<EVENTS extends EventLike>(
  options?: SubscribeNodeOptions,
): SubscribeNode<EVENTS> {
  return new SubscriberNodeClass(options);
}
