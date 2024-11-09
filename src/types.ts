export type EventLike = Record<string, unknown>;

export type Unscubscriber = () => void;

type BaseCallback = (type: string, payload?: any) => void;

export interface ReadableNodeImpl {
  on(type: string, callback: BaseCallback): Unscubscriber;
  once(type: string, callback: BaseCallback): Unscubscriber;
  off(type: string, callback: BaseCallback): void;

  addEventListener(type: string, callback: BaseCallback): Unscubscriber;
  removeEventListener(type: string, callback: BaseCallback): void;

  subscribe(type: string, callback: BaseCallback): Unscubscriber;
  unscubscribe(type: string, callback: BaseCallback): void;

  destroy(): void;
}

export interface NodeImpl extends ReadableNodeImpl {
  getWatchedTransports: () => Readonly<Map<string, Set<ReadableNodeImpl>>>;
}

export interface TransportRootImpl extends ReadableNodeImpl {
  send(type: string, ...other: any[]): Promise<void>;

  asReadonly(): ReadableNodeImpl;
}
