import type { EventLike } from '../types';

import { BaseEventBus as BaseEventBusClass } from './baseEventBus';
import type { BaseEventBus, BaseEventBusOptions } from './types';

/**
 * Helper for creating base event bus
 */
export function createBaseEventBus<EVENTS extends EventLike>(
  options?: BaseEventBusOptions,
): BaseEventBus<EVENTS> {
  return new BaseEventBusClass<EVENTS>(options);
}
