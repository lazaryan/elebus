import type { DestroyedNode, EventLike, Unscubscriber } from '../types';

export interface BaseEventBusSubscriber<EVENTS extends EventLike> {
  on<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    callback: (payload: EVENTS[EVENT]) => void,
  ): Unscubscriber;
  once<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    callback: (payload: EVENTS[EVENT]) => void,
  ): Unscubscriber;

  off<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    callback: (payload: EVENTS[EVENT]) => void,
  ): void;
}

type BaseEventBusExtends<EVENTS extends EventLike> = DestroyedNode &
  BaseEventBusSubscriber<EVENTS>;

export interface BaseEventBus<EVENTS extends EventLike>
  extends BaseEventBusExtends<EVENTS> {
  send<EVENT extends string & keyof EVENTS>(
    event: EVENT,
    payload: EVENTS[EVENT],
  ): void;
}
