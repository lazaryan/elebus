import { createNode, TransportNode } from '../node';
import type { EventLike, TransportRootImpl, Unscubscriber } from '../types';
import { noopFunction } from '../utils';

type Subscribers = Map<string, Set<(...args: any) => void>>;
export type TransportSendOptions = { sync?: boolean };

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
  private __isDestroyed = false;

  /**
   * @internal
   */
  private __unsubscribeForStore<
    EVENT_TYPE extends string & (keyof EVENTS | '*'),
  >(
    store: Subscribers,
    type: EVENT_TYPE,
    callback: (...args: any) => void,
  ): void {
    if (this.__isDestroyed) return;

    const subscribers = store.get(type);
    if (!subscribers || !subscribers.size) return;

    subscribers.delete(callback);
    if (!subscribers.size) {
      store.delete(type);
    }
  }

  /**
   * @internal
   */
  private __unsubscribe<EVENT_TYPE extends string & (keyof EVENTS | '*')>(
    type: EVENT_TYPE,
    callback: (...args: any) => void,
  ): void {
    if (this.__isDestroyed) return;

    this.__unsubscribeForStore(this.__subscribersOnce, type, callback);
    this.__unsubscribeForStore(this.__subscribers, type, callback);
  }

  /**
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
    if (this.__isDestroyed) return noopFunction;

    const subscribers = store.get(type);
    if (subscribers) {
      subscribers.add(callback);
    } else {
      store.set(type, new Set([callback]));
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
    if (this.__isDestroyed) return;

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

  public get isDestroyed() {
    return this.__isDestroyed;
  }

  public on = this.__subscribe.bind(this, this.__subscribers);
  public once = this.__subscribe.bind(this, this.__subscribersOnce);
  public off = this.__unsubscribe;

  public addEventListener = this.on;
  public removeEventListener = this.off;

  public send = this.__send;

  public asReadonly(): TransportNode<EVENTS, ''> {
    const children = new Map();
    children.set('', new Set([this]));

    return createNode({ children });
  }

  public destroy() {
    if (this.__isDestroyed) return;
    this.__isDestroyed = true;

    setTimeout(() => {
      this.__subscribersOnce.forEach((subscribers) => subscribers.clear());
      this.__subscribersOnce.clear();

      this.__subscribers.forEach((subscribers) => subscribers.clear());
      this.__subscribers.clear();
    }, 0);
  }
}
