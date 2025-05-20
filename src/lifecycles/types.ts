import type { BaseEventBusReadonly } from '../baseEventBus';
import type { BufferNode } from '../bufferNode';
import type { TransportRootSubscribers } from '../rootTypes';
import type { SubscribeNode } from '../subscribeNode';
import type { TransportRoot } from '../transport';
import type { EventLike } from '../types';

export type AllowedNodes<EVENTS extends EventLike> =
  | TransportRoot<EVENTS>
  | BufferNode<EVENTS>
  | SubscribeNode<EVENTS>;

export type TransportLifecycleEvents<EVENTS extends EventLike> = {
  /**
   * The transport was cleared. After that,
   * it stops functioning and all data in it is cleared.
   */
  destroy: undefined;
  /**
   * Subscribed to some event.
   * The object indicates what event was subscribed to and whether it is the first.
   */
  subscribe: {
    event: string & keyof EVENTS;
    mode: 'on' | 'once';
    subscriber: Parameters<TransportRootSubscribers<EVENTS>['on']>[1];
    subscribersCount: number;
  };
  /**
   * Unsubscribed from some event.
   * The object indicates what event was unsubscribed from and whether there are more subscribers.
   */
  unsubscribe: {
    event: string & keyof EVENTS;
    mode: 'on' | 'once';
    subscriber: Parameters<TransportRootSubscribers<EVENTS>['off']>[1];
    subscribersCount: number;
  };
};

export interface Lifecycles {
  create<EVENTS extends EventLike>(
    transport: AllowedNodes<EVENTS>,
  ): BaseEventBusReadonly<TransportLifecycleEvents<EVENTS>>;

  send<
    EVENTS extends EventLike,
    EVENT extends keyof TransportLifecycleEvents<EVENTS>,
    PAYLOAD extends TransportLifecycleEvents<EVENTS>[EVENT],
  >(
    transport: AllowedNodes<EVENTS>,
    event: EVENT,
    payload: PAYLOAD,
  ): void;

  delete<EVENTS extends EventLike>(transport: AllowedNodes<EVENTS>): void;
}
