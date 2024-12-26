import type { TransportRootBase, TransportRootSubscribers } from '../rootTypes';
import type { BaseTransportNodeReadonly, EventLike } from '../types';

export type TransportOptions = {
  /**
   * Transport name
   *
   * @default undefined
   */
  name?: string;
  /**
   * Sync mode sending events
   *
   * @default false
   */
  sync?: boolean;
};

export interface TransportRoot<EVENTS extends EventLike>
  extends TransportRootBase<EVENTS> {
  /**
   * Sync mode sending events
   *
   * @default false
   */
  sync?: Readonly<boolean>;

  /**
   * Method for sending an event to listeners.
   * If the transport was destroyed,
   * or no one is subscribed to this event, the method will do nothing.
   *
   * If there are subscribers to *,
   * they will listen to all events that were forwarded.
   *
   * The method works in 2 modes: synchronous and asynchronous (asynchronous mode is enabled by default).
   * To change this, you need to pass the 3rd argument.
   *
   * @example
   * ```ts
   * type Events = { event: string, event_empty: undefined };
   * const transport = createTransport<Events>();
   *
   * transport.on('event', (event, payload) => console.log(payload));
   * transport.on('event_empty', (event, payload) => console.log(payload));
   * transport.on('*', (event, payload) => console.log(payload));
   *
   * transport.send('event', 'test');
   * transport.send('event_empty');
   * transport.send('event_empty', undefined);
   * ```
   */
  send<
    TYPE extends string & keyof EVENTS,
    PARAMETERS extends EVENTS[TYPE] extends undefined
      ? (payload?: EVENTS[TYPE]) => void
      : (payload: EVENTS[TYPE]) => void,
  >(
    type: TYPE,
    ...other: Parameters<PARAMETERS>
  ): void;

  /**
   * Method for getting a node that has only subscription interfaces (on/once/off).
   * Recommended for use in public API services to hide methods
   * for direct control of transport state from the outside.
   */
  asReadonly(): TransportReadonlyNode<EVENTS>;
}

type TransportReadonlyNodeBase<EVENTS extends EventLike> =
  TransportRootSubscribers<EVENTS> & BaseTransportNodeReadonly;

export interface TransportReadonlyNode<EVENTS extends EventLike>
  extends TransportReadonlyNodeBase<EVENTS> {
  lifecycle: TransportRoot<EVENTS>['lifecycle'];
}
