import { EventLike } from '../types';

import { Transport } from './transport';

export function createTransport<T extends EventLike>(): Transport<T> {
  return new Transport<T>();
}
