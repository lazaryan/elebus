import {
  BaseEventBus,
  BaseEventBusReadonly,
  createBaseEventBus,
  createBaseEventBusReadonly,
} from '../baseEventBus';
import { EventLike } from '../types';

import type {
  AllowedNodes,
  Lifecycles as LifecyclesImpl,
  TransportLifecycleEvents,
} from './types';

export class Lifecycles implements LifecyclesImpl {
  private __lifecycles: WeakMap<
    AllowedNodes<EventLike>,
    BaseEventBus<TransportLifecycleEvents<any>>
  > = new WeakMap();

  public create = <EVENTS extends EventLike>(
    transport: AllowedNodes<EVENTS>,
  ): BaseEventBusReadonly<TransportLifecycleEvents<EVENTS>> => {
    const lifecycle = createBaseEventBus<TransportLifecycleEvents<EVENTS>>({
      name: transport?.name ? `${transport?.name}__lifecycle` : undefined,
    });

    this.__lifecycles.set(transport, lifecycle);
    return createBaseEventBusReadonly(lifecycle);
  };

  public send = <
    EVENTS extends EventLike,
    EVENT extends keyof TransportLifecycleEvents<EVENTS>,
    PAYLOAD extends TransportLifecycleEvents<EVENTS>[EVENT],
  >(
    transport: AllowedNodes<EVENTS>,
    event: EVENT,
    payload: PAYLOAD,
  ) => {
    const lifecycle = this.__lifecycles.get(transport);
    if (lifecycle) {
      lifecycle.send(event, payload);
    }
  };

  public delete = <EVENTS extends EventLike>(
    transport: AllowedNodes<EVENTS>,
  ) => {
    const lifecycle = this.__lifecycles.get(transport);
    if (lifecycle) {
      lifecycle.destroy();

      this.__lifecycles.delete(transport);
    }
  };
}
