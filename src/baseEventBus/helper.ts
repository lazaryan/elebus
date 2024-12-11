import type { EventLike } from '../types';

import { BaseEventBus as BaseEventBusClass } from './baseEventBus';
import { BaseEventBusReadonly as BaseEventBusReadonlyClass } from './baseEventBusReadonly';
import type {
  BaseEventBus,
  BaseEventBusOptions,
  BaseEventBusReadonly,
} from './types';

/**
 * Helper for creating base event bus
 */
export function createBaseEventBus<EVENTS extends EventLike>(
  options?: BaseEventBusOptions,
): BaseEventBus<EVENTS> {
  return new BaseEventBusClass<EVENTS>(options);
}

/**
 * Helper for creating readonly node event bus
 */
export function createBaseEventBusReadonly<EVENTS extends EventLike>(
  node: BaseEventBus<EVENTS>,
): BaseEventBusReadonly<EVENTS> {
  return new BaseEventBusReadonlyClass<EVENTS>(node);
}
