import type { EventLike } from '../types';

import { Transport as TransportClass } from './transport';
import type { TransportOptions, TransportRoot } from './types';

function getSharedCacheId({ name, sync }: TransportOptions): string {
  return `${name}_${sync ? 's' : 'as'}`;
}

const sharedTransports = new Map<string, TransportRoot<EventLike>>();

/**
 * Helper for create transport node
 */
export function createTransport<T extends EventLike>(
  options?: TransportOptions,
): TransportRoot<T> {
  if (options?.shared && options.name) {
    const cacheId = getSharedCacheId(options);

    const savedTransport = sharedTransports.get(cacheId);
    if (savedTransport) return savedTransport;

    const newTransport = new TransportClass<T>(options);
    newTransport.lifecycle.on('destroy', () => {
      sharedTransports.delete(cacheId);
    });

    sharedTransports.set(cacheId, newTransport);
    return newTransport;
  }

  return new TransportClass<T>(options);
}
