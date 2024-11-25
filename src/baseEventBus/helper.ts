import type { EventLike } from '../types';

import { BaseEventBus as BaseEventBusClass } from './baseEventBus';
import type { BaseEventBus } from './types';

export function createBaseEventBus<
  EVENTS extends EventLike,
>(): BaseEventBus<EVENTS> {
  return new BaseEventBusClass<EVENTS>();
}
