import type { TransportRoot } from './transport';

export type EventLike = Record<string, unknown>;

/**
 * unsubscribe function to unsubscribe from an event.
 */
export type Unsubscriber = () => void;

export type AnyFunction = (...args: any[]) => void;

export type Namespace = string;
export type TransportRootNodes = Record<Namespace, Array<TransportRoot<any>>>;

export type TimeoutRef = ReturnType<typeof setTimeout>;

export interface DestroyedNode {
  isDestroyed: boolean;

  destroy(): void;
}

export interface BaseTransportRoot extends DestroyedNode {
  name?: string;
  __isRoot: Readonly<true>;
}

export interface BaseTransportNode extends DestroyedNode {
  name?: string;
  __isRoot: Readonly<false>;

  /**
   * Method to get the root node object referenced by the node.
   */
  getTransports: () => TransportRootNodes;
}

export interface BaseTransportNodeReadonly {
  name?: string;
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
