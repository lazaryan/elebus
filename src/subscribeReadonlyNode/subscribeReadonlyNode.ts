import type { SubscribeNode } from '../subscribeNode';
import type { EventLike, Unscubscriber } from '../types';

import type { SubscribeReadonlyNode as SubscribeReadonlyNodeImpl } from './types';

export class SubscribeReadonlyNode<EVENTS extends EventLike>
  implements SubscribeReadonlyNodeImpl<EVENTS>
{
  /**
   * @internal
   */
  private __node: SubscribeNode<EVENTS>;

  /**
   * @internal
   */
  public readonly __isRoot: false = false as const;
  public name?: string | undefined;

  constructor(node: SubscribeNode<EVENTS>) {
    this.__node = node;

    if (node.name) {
      this.name = `${node.name}__readonly_node`;
    }
  }

  get isDestroyed(): boolean {
    return this.__node.isDestroyed;
  }

  getTransports() {
    return this.__node.getTransports();
  }

  on(type: string, callback: () => void): Unscubscriber {
    return this.__node.on(type, callback);
  }

  once(type: string, callback: () => void): Unscubscriber {
    return this.__node.once(type, callback);
  }

  off(type: string, callback: () => void): void {
    return this.__node.off(type, callback);
  }
}
