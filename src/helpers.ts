import { Transport } from './transport';
import { EventLike } from './types';

export function createTransport<T extends EventLike>(): Transport<T> {
  return new Transport<T>();
}
