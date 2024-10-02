import { EventLike, Unscubscriber } from '../types';

import { TransportNodeImpl } from './types';

export class BaseNode<EVENTS extends EventLike> implements TransportNodeImpl {
  private __subscribe<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
    EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(_type: EVENT_TYPE, _callback: (...args: CB[EVENT]) => void): Unscubscriber {
    return () => {};
  }

  public on = this.__subscribe;

  public destroy(): void {}
}
