import type { EventLike } from '../types';

import { BaseEventBusReadonly as BaseEventBusReadonlyClass } from './baseEventBusReadonly';
import type {
  BaseEventBusReadonly,
  BaseEventBusReadonlyOptions,
} from './types';

/**
 * Helper for creating readonly wrapper for base event bus
 */
export function createBaseEventBusReadonly<EVENTS extends EventLike>(
  options: BaseEventBusReadonlyOptions<EVENTS>,
): BaseEventBusReadonly<EVENTS> {
  return new BaseEventBusReadonlyClass<EVENTS>(options);
}
