import { createNode, TransportNode } from '../node';
import type { EventLike, TransportRootImpl, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

import { TransportOptions } from './types';

type Subscribers = Map<string, Set<(...args: any) => void>>;
export type TransportSendOptions = { sync?: boolean };

export type InternalsEvents = {
  ___elebus_root_destroy: undefined;
};

const DEFAULT_SEND_OPTIONS: TransportSendOptions = { sync: false };

export class Transport<EVENTS extends EventLike> implements TransportRootImpl {
  /**
   * @internal
   */
  private __subscribers: Subscribers = new Map();
  /**
   * @internal
   */
  private __subscribersOnce: Subscribers = new Map();

  /**
   * @internal
   */
  private onDestroy: TransportOptions['onDestroy'];
  /**
   * @internal
   */
  private onSubscribe: TransportOptions['onSubscribe'];
  /**
   * @internal
   */
  private onUnsubscribe: TransportOptions['onUnsubscribe'];

  /**
   * Whether this node is destroyed.
   * When the value becomes true,
   * all data is cleared and subscriptions stop working.
   */
  public isDestroyed: boolean = false;
  /**
   * Transport name
   */
  public readonly name: TransportOptions['name'] = undefined;

  constructor(options?: TransportOptions) {
    if (options) {
      this.name = options.name;

      this.onDestroy = options.onDestroy;
      this.onSubscribe = options.onSubscribe;
      this.onUnsubscribe = options.onUnsubscribe;
    }
  }

  /**
   * unsubscribe from an event for a specific store.
   * If there are no subscribers left for the event, we remove it from the map.
   *
   * If the onUnsubscribe lifecycle callback is passed,
   * it will be called each time this function is called.
   *
   * If the transport was destroyed, the method does not work.
   *
   * @internal
   */
  private __unsubscribeForStore<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
  >(
    store: Subscribers,
    type: EVENT_TYPE,
    callback: (...args: any) => void,
  ): void {
    if (this.isDestroyed) return;

    const subscribers = store.get(type);
    if (!subscribers || !subscribers.size) return;

    subscribers.delete(callback);
    if (!subscribers.size) {
      store.delete(type);

      if (this.onUnsubscribe) {
        this.onUnsubscribe(type, subscribers?.size > 0);
      }
    } else if (this.onUnsubscribe) {
      this.onUnsubscribe(type, true);
    }
  }

  /**
   * @internal
   */
  private __unsubscribe<EVENT_TYPE extends string & (keyof EVENTS | '*')>(
    type: EVENT_TYPE,
    callback: (...args: any) => void,
  ): void {
    if (this.isDestroyed) return;

    this.__unsubscribeForStore(this.__subscribersOnce, type, callback);
    this.__unsubscribeForStore(this.__subscribers, type, callback);
  }

  /**
   * Method for subscribing to bus events for a specific store.
   * In addition to events of the type, you can also specify the * event,
   * which will allow you to subscribe to all bus events.
   * The method returns a function for unsubscribing the callback
   * (this can also be done via the off or removeEventListener methods).
   * 
   * If the onSubscribe lifecycle method is passed,
   * it will be called when this event is sent.
   * 
   * If the transport was destroyed, this method will do nothing.

   * @internal
   */
  private __subscribe<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
    EVENT extends EVENT_TYPE extends '*' ? string & keyof EVENTS : EVENT_TYPE,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(
    store: Subscribers,
    type: EVENT_TYPE,
    callback: (...args: CB[EVENT]) => void,
  ): Unscubscriber {
    if (this.isDestroyed) return noopFunction;

    const subscribers = store.get(type);
    if (subscribers) {
      subscribers.add(callback);
      this.onSubscribe?.(type, false);
    } else {
      store.set(type, new Set([callback]));
      this.onSubscribe?.(type, true);
    }

    return () => this.__unsubscribeForStore(store, type, callback);
  }

  /**
   * @internal
   */
  private __send<
    TYPE extends string & keyof EVENTS,
    PARAMETERS extends EVENTS[TYPE] extends undefined | null
      ? (payload?: EVENTS[TYPE], options?: TransportSendOptions) => void
      : (payload: EVENTS[TYPE], options?: TransportSendOptions) => void,
  >(type: TYPE, ...other: Parameters<PARAMETERS>): void {
    if (this.isDestroyed) return;

    const subscribers = [
      ...(this.__subscribers.get(type) ?? []),
      ...(this.__subscribers.get('*') ?? []),
    ];
    const subscribersOnce = [
      ...(this.__subscribersOnce.get(type) ?? []),
      ...(this.__subscribersOnce.get('*') ?? []),
    ];
    if (!subscribers.length && !subscribersOnce.length) return;

    const [payload = undefined, options = DEFAULT_SEND_OPTIONS] = other;

    if (options.sync) {
      if (subscribersOnce.length) {
        for (const subscriber of subscribersOnce) {
          subscriber(type, payload);
        }

        this.__subscribersOnce.get(type)?.clear();
        this.__subscribersOnce.get('*')?.clear();
        this.__subscribersOnce.delete(type);
      }
      if (subscribers.length) {
        for (const subscriber of subscribers) {
          subscriber(type, payload);
        }
      }
    } else {
      if (subscribers.length) {
        Promise.resolve().then(() => {
          if (subscribers.length) {
            for (const subscriber of subscribers) {
              subscriber(type, payload);
            }
          }
        });
      }
      if (subscribersOnce.length) {
        Promise.resolve().then(() => {
          if (subscribersOnce.length) {
            for (const subscriber of subscribersOnce) {
              subscriber(type, payload);
            }
            this.__subscribersOnce.get(type)?.clear();
            this.__subscribersOnce.get('*')?.clear();
            this.__subscribersOnce.delete(type);
          }
        });
      }
    }
  }

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
  public on = this.__subscribe.bind(this, this.__subscribers);
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
  public once = this.__subscribe.bind(this, this.__subscribersOnce);
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
  public off = this.__unsubscribe;

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
   * transport.addEventListener('event', (event, payload) => console.log(payload));
   * const unsubscriber = transport.addEventListener('*', (event, payload) => console.log(payload));
   * unsubscriber();
   *
   * transport.send('event', 'test');
   * ```
   */
  public addEventListener = this.on;
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
   * transport.addEventListener('event', handler);
   * transport.removeEventListener('event', handler);
   * ```
   */
  public removeEventListener = this.off;

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
   * transport.send('event', 'test', { sync: true });
   * transport.send('event_empty');
   * transport.send('event_empty', undefined, { sync: true });
   * ```
   */
  public send = this.__send;

  /**
   * Method of returning a bus in readOnly mode in which the send method is missing.
   */
  public asReadonly(): TransportNode<EVENTS, ''> {
    const children = new Map();
    children.set('', new Set([this]));

    return createNode({ children });
  }

  /**
   * Method of destroying transport.
   * After this, subscription and sending events will not work,
   * and all data will be cleared.
   */
  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.onSubscribe = undefined;
    this.onUnsubscribe = undefined;

    const subscribersDestroy = this.__subscribersOnce.get(
      '___elebus_root_destroy',
    );
    if (subscribersDestroy) {
      setTimeout(() => {
        subscribersDestroy.forEach((subscruber) => subscruber());
      }, 0);
    }

    setTimeout(() => {
      this.__subscribersOnce.forEach((subscribers) => subscribers.clear());
      this.__subscribersOnce.clear();

      this.__subscribers.forEach((subscribers) => subscribers.clear());
      this.__subscribers.clear();
    }, 0);

    this.onDestroy?.();
    this.onDestroy = undefined;
  }
}
