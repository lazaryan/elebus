import type { BaseEventBusReadonly } from '../baseEventBusReadonly';
import type { TransportReadonlyNode } from '../transportReadonlyNode';
import type {
  BaseTransportRoot,
  DestroyedNode,
  EventLike,
  Unscubscriber,
} from '../types';

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
    subscriber: <
      EVENT_TYPE extends string & (keyof EVENTS | '*'),
      EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
      CB extends {
        [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
      },
    >(
      ...args: CB[EVENT]
    ) => void;
    subscribersCount: number;
  };
  /**
   * Unsubscribed from some event.
   * The object indicates what event was unsubscribed from and whether there are more subscribers.
   */
  unsubscribe: {
    event: string & keyof EVENTS;
    mode: 'on' | 'once';
    subscriber: <
      EVENT_TYPE extends string & (keyof EVENTS | '*'),
      EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
      CB extends {
        [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
      },
    >(
      ...args: CB[EVENT]
    ) => void;
    subscribersCount: number;
  };
};

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

export interface TransportRootSubscribers<EVENTS extends EventLike> {
  /**
   * Method for subscribing to bus events.
   * In addition to events of the type, you can also specify the * event,
   * which will allow you to subscribe to all bus events.
   * The method returns a function for unsubscribing the callback
   * (this can also be done via the off or removeEventListener methods).
   *
   * If the onSubscribe lifecycle method is passed,
   * it will be called when this event is sent.
   *
   * If the transport was destroyed, this method will do nothing.
   *
   * @example
   * ```ts
   * type Events = { event: string };
   * const transport = createTransport<Events>();
   *
   * transport.on('event', (event, payload) => console.log(payload));
   * const unsubscriber = transport.on('*', (event, payload) => console.log(payload));
   * unsubscriber();
   *
   * transport.send('event', 'test');
   * ```
   */
  on<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
    EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(
    event: EVENT_TYPE,
    callback: (...args: CB[EVENT]) => void,
  ): Unscubscriber;
  /**
   * A method for one-time subscription to bus events.
   * In addition to events of the type, you can also specify an event *,
   * which will allow you to subscribe to all bus events.
   * The method returns a function for unsubscribing the callback
   * (this can also be done via the off or removeEventListener methods).
   *
   * If the onSubscribe lifecycle method is passed,
   * it will be called when this event is sent.
   *
   * If the transport was destroyed, this method will do nothing.
   *
   * @example
   * ```ts
   * type Events = { event: string };
   * const transport = createTransport<Events>();
   *
   * transport.once('event', (event, payload) => console.log(payload));
   * const unsubscriber = transport.once('*', (event, payload) => console.log(payload));
   * unsubscriber();
   *
   * transport.send('event', 'test');
   * transport.send('event', 'test'); // not call subscribers
   * ```
   */
  once<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
    EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(
    event: EVENT_TYPE,
    callback: (...args: CB[EVENT]) => void,
  ): Unscubscriber;
  /**
   * unsubscribe from an event.
   * If there are no subscribers left for the event, we remove it from the map.
   *
   * If the onUnsubscribe lifecycle callback is passed,
   * it will be called each time this function is called.
   *
   * If the transport was destroyed, the method does not work.
   *
   * @example
   * ```ts
   * type Events = { event: string };
   * const transport = createTransport<Events>();
   *
   * function handler(type: string, payload: string): void {}
   *
   * transport.on('event', handler);
   * transport.off('event', handler);
   * ```
   */
  off<EVENT_TYPE extends string & (keyof EVENTS | '*')>(
    event: EVENT_TYPE,
    callback: (...args: any[]) => void,
  ): void;
}

type TransportRootSubscribersExtends<EVENTS extends EventLike> =
  TransportRootSubscribers<EVENTS> & DestroyedNode & BaseTransportRoot;

export interface TransportRoot<EVENTS extends EventLike>
  extends TransportRootSubscribersExtends<EVENTS> {
  /**
   * Transport name
   */
  name?: Readonly<string>;
  /**
   * Sync mode sending events
   *
   * @default false
   */
  sync?: Readonly<boolean>;
  /**
   * Transport lifecycle event bus. You can subscribe to 3 events:
   * 1) destroy - the transport was cleared. After that, it stops functioning and all data in it is cleared.
   * 2) subscribe - subscribed to some event. The object indicates what event was subscribed to and whether it is the first.
   * 3) unsubscribe - unsubscribed from some event. The object indicates what event was unsubscribed from and whether there are more subscribers.
   *
   * When the main transport is destroyed, the lifecycle event bus also dies.
   *
   * @example
   * ```ts
   * const transport = createTransport<Events>();
   *
   * transport.lifecycle.on('destroy', () => console.log('transport is destroy'));
   * transport.lifecycle.on('subscribe', ({ event, isFirstSubscribe }) => console.log(`subscribe to event ${event} isFirst=${isFirstSubscribe}`));
   * transport.lifecycle.on('unubscribe', ({ event, isHasSubscribers }) => console.log(`unsubscribe from event ${event} isHasSubscribers=${isHasSubscribers}`));
   *
   * const unsubscriber1 = transport.on('event1', () => {}) // subscribe to event event1 isFirst=true
   * const unsubscriber2 = transport.on('event1', () => {}) // subscribe to event event1 isFirst=false
   * const unsubscriber3 = transport.on('event2', () => {}) // subscribe to event event2 isFirst=true
   *
   * unsubscriber3() // unsubscribe from event event2 isHasSubscribers=false
   * unsubscriber2() // unsubscribe from event event1 isHasSubscribers=true
   * unsubscriber1() // unsubscribe from event event1 isHasSubscribers=false
   *
   * transport.destroy(); // transport is destroy
   * ```
   */
  lifecycle: Readonly<BaseEventBusReadonly<TransportLifecycleEvents<EVENTS>>>;

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
