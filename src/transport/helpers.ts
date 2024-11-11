import { EventLike } from '../types';

import { Transport } from './transport';
import { TransportOptions } from './types';

export function createTransport<T extends EventLike>(
  options?: TransportOptions,
): Transport<T> {
  return new Transport<T>(options);
}
