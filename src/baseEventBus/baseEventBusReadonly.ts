import type { AnyFunction, EventLike, Unsubscriber } from '../types';

import type {
  BaseEventBus,
  BaseEventBusReadonly as BaseEventBusReadonlyImpl,
} from './types';

export class BaseEventBusReadonly<EVENTS extends EventLike>
  implements BaseEventBusReadonlyImpl<EVENTS>
{
  public readonly name: string | undefined;

  /**
   * @internal
   */
  private __node: BaseEventBus<EVENTS>;

  constructor(eventBus: BaseEventBus<EVENTS>) {
    this.name = eventBus.name ? `${eventBus.name}__readonly_node` : undefined;
    this.__node = eventBus;
  }

  public on = (type: string, callback: AnyFunction): Unsubscriber => {
    return this.__node.on(type, callback);
  };

  public off = (type: string, callback: AnyFunction): void => {
    return this.__node.off(type, callback);
  };
}
