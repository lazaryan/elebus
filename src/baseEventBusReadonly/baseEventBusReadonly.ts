import type { BaseEventBus } from '../baseEventBus';
import type { EventLike, Unscubscriber } from '../types';

import type {
  BaseEventBusReadonly as BaseEventBusReadonlyImpl,
  BaseEventBusReadonlyOptions,
} from './types';

export class BaseEventBusReadonly<EVENTS extends EventLike>
  implements BaseEventBusReadonlyImpl<EVENTS>
{
  public readonly name: string | undefined;

  /**
   * @internal
   */
  private __eventBus: BaseEventBus<EVENTS>;

  constructor(options: BaseEventBusReadonlyOptions<EVENTS>) {
    this.name = options.name ? `${options.name}__readonly_node` : undefined;
    this.__eventBus = options.eventBus;
  }

  public on(type: string, callback: (...args: any[]) => void): Unscubscriber {
    return this.__eventBus.on(type, callback);
  }

  public off(type: string, callback: (...args: any[]) => void): void {
    return this.__eventBus.off(type, callback);
  }
}
