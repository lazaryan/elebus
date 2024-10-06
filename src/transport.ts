import { BaseNode } from './nodes/baseNode';
import type { EventLike, TransportRootImpl, Unscubscriber } from './types';

type Subscribers = Map<string, Set<(...args: any) => void>>;
type SendOptions = { sync?: boolean };

async function flushMicrotasks(timeout = 0): Promise<void> {
  return await new Promise((resolve) =>
    setTimeout(() => resolve(undefined), timeout),
  );
}

function noopFunction(): void {}

export class Transport<EVENTS extends EventLike> implements TransportRootImpl {
  private __subscribers: Subscribers = new Map();
  private __subscribersOnce: Subscribers = new Map();

  private __isDestroyed = false;

  static defaultSendOptions: SendOptions = { sync: false };

  public get isDestroyed() {
    return this.__isDestroyed;
  }

  private __unsubscribe<EVENT_TYPE extends string & (keyof EVENTS | '*')>(
    type: EVENT_TYPE,
    callback: (...args: any) => void,
  ): void {
    if (this.__isDestroyed) return;

    const subscribers = this.__subscribers.get(type);
    const subscribersOnce = this.__subscribersOnce.get(type);
    if (!subscribers && !subscribersOnce) return;

    if (subscribersOnce) {
      subscribersOnce.delete(callback);
      if (!subscribersOnce.size) {
        this.__subscribersOnce.delete(type);
      }
    }

    if (subscribers) {
      subscribers.delete(callback);
      if (!subscribers.size) {
        this.__subscribers.delete(type);
      }
    }
  }

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

    return () => this.__unsubscribe(type, callback);
  }

  private async __send<
    TYPE extends string & keyof EVENTS,
    PARAMETERS extends EVENTS[TYPE] extends undefined | null
      ? (payload?: EVENTS[TYPE], options?: SendOptions) => void
      : (payload: EVENTS[TYPE], options?: SendOptions) => void,
  >(type: TYPE, ...other: Parameters<PARAMETERS>): Promise<void> {
    if (this.__isDestroyed) return;

    const subscribers = [
      ...(this.__subscribers.get(type) ?? []),
      ...(this.__subscribers.get('*') ?? []),
    ];
    const subscribersOnce = [
      ...(this.__subscribersOnce.get(type) ?? []),
      ...(this.__subscribersOnce.get('*') ?? []),
    ];
    if (!subscribers && !subscribersOnce) return;

    const [payload = undefined, options = Transport.defaultSendOptions] = other;

    if (options.sync) {
      if (subscribersOnce) {
        subscribersOnce.forEach((subscriber) => subscriber(type, payload));
        this.__subscribersOnce.get(type)?.clear();
        this.__subscribersOnce.get('*')?.clear();
        this.__subscribersOnce.delete(type);
      }
      subscribers?.forEach((subscriber) => subscriber(type, payload));
    } else {
      if (subscribersOnce) {
        subscribersOnce.forEach(async (subscriber) => {
          await flushMicrotasks();
          subscriber(type, payload);
        });
        this.__subscribersOnce.get(type)?.clear();
        this.__subscribersOnce.get('*')?.clear();
        this.__subscribersOnce.delete(type);
      }
      subscribers?.forEach(async (subscriber) => {
        await flushMicrotasks();
        subscriber(type, payload);
      });
    }
  }

  public on = this.__subscribe.bind(this, this.__subscribers);
  public once = this.__subscribe.bind(this, this.__subscribersOnce);
  public off = this.__unsubscribe;

  public addEventListener = this.on;
  public removeEventListener = this.off;

  public subscribe = this.on;
  public unscubscribe = this.off;

  public send = this.__send;

  public asReadonly(): BaseNode<EVENTS, ''> {
    const children = new Map();
    children.set('', new Set([this]));

    return new BaseNode({ children });
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

export function createTransport<T extends EventLike>(): Transport<T> {
  return new Transport<T>();
}
