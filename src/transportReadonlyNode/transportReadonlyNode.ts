import type { TransportRoot } from '../transport';
import type { EventLike, Unscubscriber } from '../types';

import type { TransportReadonlyNode as TransportReadonlyNodeImpl } from './types';

export class TransportReadonlyNode<EVENTS extends EventLike>
  implements TransportReadonlyNodeImpl<EVENTS>
{
  /**
   * @internal
   */
  private __root: TransportRoot<any>;
  /**
   * @internal
   */
  public readonly __isRoot: false = false as const;
  public name: string | undefined = undefined;

  constructor(root: TransportRoot<any>) {
    this.__root = root;

    if (root.name) {
      this.name = `${root.name}__readonly_node`;
    }
  }

  get isDestroyed() {
    return this.__root.isDestroyed;
  }

  get lifecycle() {
    return this.__root.lifecycle;
  }

  public getTransports() {
    return { '': [this.__root] };
  }

  public on(type: string, callback: () => void): Unscubscriber {
    return this.__root.on(type, callback);
  }

  public once(type: string, callback: () => void): Unscubscriber {
    return this.__root.once(type, callback);
  }

  public off(type: string, callback: () => void): void {
    return this.__root.off(type, callback);
  }
}
