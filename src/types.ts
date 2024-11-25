import type { TransportRoot } from './transport';

export type EventLike = Record<string, unknown>;

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
  isDestroyed: boolean;

  getTransports: () => TransportRootNodes;
}
