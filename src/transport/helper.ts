import type { EventLike } from '../types';

import { Transport as TransportClass } from './transport';
import type { TransportOptions, TransportRoot } from './types';

/**
 * Helper for create transport node
 */
export function createTransport<T extends EventLike>(
  options?: TransportOptions,
): TransportRoot<T> {
  return new TransportClass<T>(options);
}
