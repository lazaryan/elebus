import type { TransportRoot } from './transport';

export type EventLike = Record<string, unknown>;

/**
 * unsubscribe function to unsubscribe from an event.
 */
export type Unscubscriber = () => void;

export type Namespace = string;
export type TransportRootNodes = Record<Namespace, Array<TransportRoot<any>>>;

export interface DestroyedNode {
  isDestroyed: boolean;

  destroy(): void;
}

export interface BaseTransportRoot {
  /**
   * @internal
   */
  __isRoot: Readonly<true>;
}

export interface BaseTransportNode {
  /**
   * @internal
   */
  __isRoot: Readonly<false>;
  /**
   * A property indicating that a class has been destroyed.
   * Once resolved, all methods in it stop working and the data is cleared.
   */
  isDestroyed: boolean;

  /**
   * Method to get the root node object referenced by the node.
   */
  getTransports: () => TransportRootNodes;
}
