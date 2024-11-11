export type EventLike = Record<string, unknown>;

export type Unscubscriber = () => void;

type BaseCallback = (type: string, payload?: any) => void;

export interface ReadableNodeImpl {
  isDestroyed: boolean;

  on(type: string, callback: BaseCallback): Unscubscriber;
  once(type: string, callback: BaseCallback): Unscubscriber;
  off(type: string, callback: BaseCallback): void;

  addEventListener(type: string, callback: BaseCallback): Unscubscriber;
  removeEventListener(type: string, callback: BaseCallback): void;

  destroy(): void;
}

export interface NodeImpl extends ReadableNodeImpl {
  getWatchedTransports: () => Readonly<Map<string, Set<ReadableNodeImpl>>>;

  channel: (channel: any) => NodeImpl;
}

export interface TransportRootImpl extends ReadableNodeImpl {
  send(type: string, ...other: any[]): void;

  asReadonly(): ReadableNodeImpl;
}
