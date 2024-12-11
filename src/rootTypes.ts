import type { BaseTransportRoot, EventLike, Unsubscriber } from './types';

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
  ): Unsubscriber;
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
  ): Unsubscriber;
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

export type TransportRootBase<EVENTS extends EventLike> =
  TransportRootSubscribers<EVENTS> & BaseTransportRoot;
