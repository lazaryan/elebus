import type { TransportRoot } from '../transport';
import type {
  AnyFunction,
  EventLike,
  TransportRootNodes,
  Unsubscriber,
} from '../types';

import type { TransportReadonlyNode as TransportReadonlyNodeImpl } from './types';

class TransportReadonlyNode<EVENTS extends EventLike>
  implements TransportReadonlyNodeImpl<EVENTS>
{
  /**
   * @internal
   */
  private __root: TransportRoot<EVENTS>;

  public readonly __isRoot: false = false as const;

  public readonly name: Readonly<string | undefined> = undefined;

  constructor(root: TransportRoot<EVENTS>) {
    this.__root = root;

    if (root.name) {
      this.name = `${root.name}__readonly_node`;
    }
  }

  get isDestroyed(): boolean {
    return this.__root.isDestroyed;
  }

  get lifecycle(): TransportRoot<EVENTS>['lifecycle'] {
    return this.__root.lifecycle;
  }

  public getTransports = (): TransportRootNodes => {
    return { '': [this.__root] };
  };

  public on = (type: string, callback: AnyFunction): Unsubscriber => {
    return this.__root.on(type, callback);
  };

  public once = (type: string, callback: AnyFunction): Unsubscriber => {
    return this.__root.once(type, callback);
  };

  public off = (type: string, callback: AnyFunction): void => {
    return this.__root.off(type, callback);
  };
}

/**
 * Helper for create transport node
 */
export function createTransportReadonlyNode<T extends EventLike>(
  root: TransportRoot<T>,
): TransportReadonlyNode<T> {
  return new TransportReadonlyNode<T>(root);
}
