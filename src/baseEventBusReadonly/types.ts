import type { BaseEventBus, BaseEventBusSubscriber } from '../baseEventBus';
import type { EventLike } from '../types';

export type BaseEventBusReadonlyOptions<EVENTS extends EventLike> = {
  name?: string;
  eventBus: BaseEventBus<EVENTS>;
};

export interface BaseEventBusReadonly<EVENTS extends EventLike>
  extends BaseEventBusSubscriber<EVENTS> {
  name?: string;
}
