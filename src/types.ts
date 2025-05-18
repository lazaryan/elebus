import type { TransportRoot } from './transport';

export type EventLike = Record<string, unknown>;

/**
 * unsubscribe function to unsubscribe from an event.
 */
export type Unsubscriber = () => void;

export type AnyFunction = (...args: any[]) => void;

export type Namespace = string;
/**
 * List of nodes the node is subscribed to.
 */
export type TransportRootNodes = Record<Namespace, Array<TransportRoot<any>>>;

export type TimeoutRef = ReturnType<typeof setTimeout>;

/**
 * Event name for subscribe to all events in transport
 */
export type AllEventTypes = '*';

/**
 * A node that has a cleanup mechanism. After the method chchchch is executed,
 * the node becomes inactive because event subscriptions and message sending stop functioning.
 */
export interface DestroyedNode {
  /**
   * whether the transport is destroyed.
   * If the transport is destroyed,
   * then subscriptions and event sending do not work, and the subscriber list is destroyed.
   * Also, all dependent nodes are automatically unsubscribed from the destroyed node.
   */
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
