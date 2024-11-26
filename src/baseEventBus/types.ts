import type { DestroyedNode, EventLike, Unscubscriber } from '../types';

export interface BaseEventBusSubscriber<EVENTS extends EventLike> {
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
   * const eventBus = createBaseEventBus<Events>();
   *
   * const unsubscriber = eventBus.on('event', (event, payload) => console.log(payload));
   * unsubscriber();
   *
   * eventBus.send('event', 'test');
   * ```
   */
  on<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    callback: (event: EVENT, payload: EVENTS[EVENT]) => void,
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
   * const eventBus = createBaseEventBus<Events>();
   *
   * const unsubscriber = eventBus.once('event', (event, payload) => console.log(payload));
   * unsubscriber();
   *
   * eventBus.send('event', 'test');
   * eventBus.send('event', 'test'); // not call subscribers
   * ```
   */
  once<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    callback: (event: EVENT, payload: EVENTS[EVENT]) => void,
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
   * const eventBus = createBaseEventBus<Events>();
   *
   * function handler(type: string, payload: string): void {}
   *
   * eventBus.on('event', handler);
   * eventBus.off('event', handler);
   * ```
   */
  off<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    callback: (event: EVENT, payload: EVENTS[EVENT]) => void,
  ): void;
}

type BaseEventBusExtends<EVENTS extends EventLike> = DestroyedNode &
  BaseEventBusSubscriber<EVENTS>;

export interface BaseEventBus<EVENTS extends EventLike>
  extends BaseEventBusExtends<EVENTS> {
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
   * const eventBus = createBaseEventBus<Events>();
   *
   * eventBus.on('event', ( payload) => console.log(payload));
   * eventBus.on('event_empty', () => {});
   *
   * eventBus.send('event', 'test');
   * eventBus.send('event_empty', undefined);
   * ```
   */
  send<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    payload: EVENTS[EVENT],
  ): void;
}
