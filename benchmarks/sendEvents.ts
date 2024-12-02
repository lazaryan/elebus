import { signal, effect } from 'nrgy';
import { Subject } from 'rxjs';
import { createAction } from 'rx-effects';
import { Bench } from 'tinybench';

import { createTransport } from '../dist';

const SUBSCRIBERS_COUNT = 2_000;

export async function benchSendEvent(isSubscribers: boolean): Promise<Bench> {
  const bench = new Bench({
    name: isSubscribers
      ? 'sending an event to which you are subscribed'
      : 'sending an event that is not subscribed to',
    setup: (_task, mode) => {
      // Run the garbage collector before warmup at each cycle
      if (mode === 'warmup' && typeof globalThis.gc === 'function') {
        globalThis.gc();
      }
    },
  });
  bench.threshold = 10_000;

  const transportSync = createTransport({ sync: true });
  const transportAsync = createTransport({ sync: false });
  const nrgySignalSync = signal<{ event: string; payload: number }>();
  const nrgySignalAsync = signal<{ event: string; payload: number }>();
  const subject = new Subject<{ event: string; payload: number }>();
  const rxEffectsAction = createAction<{ event: string; payload: number }>();

  let destroysNrgySync: Array<() => void> = [];
  let destroysNrgyAsync: Array<() => void> = [];

  let destroyRxSubject: Array<() => void> = [];
  let destroyRxEffectAction: Array<() => void> = [];

  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    transportSync.on('event', () => {});
    transportAsync.on('event', () => {});

    destroysNrgySync.push(effect(nrgySignalSync, ({ event }) => { if (event === 'event') {} }).destroy);
    destroysNrgyAsync.push(effect(nrgySignalAsync, ({ event }) => { if (event === 'event') {} }).destroy);

    const subjectSubscriber = subject.subscribe(({ event }) => { if (event === 'event') {} });
    destroyRxSubject.push(() => {
      if (!subjectSubscriber.closed) {
        subjectSubscriber.unsubscribe();
      }
    });

    const rxSubscriber = rxEffectsAction.event$.subscribe(({ event }) => { if (event === 'event') {} })
    destroyRxEffectAction.push(() => {
      if (!rxSubscriber.closed) {
        rxSubscriber.unsubscribe();
      }
    });
  }

  const sendingEvent = isSubscribers ? 'event' : 'unknown_event';

  bench.add('elebus async', () => transportAsync.send(sendingEvent, 123));
  bench.add('elebus sync', () => transportSync.send(sendingEvent, 123));
  bench.add('nrgy Signal async', () => nrgySignalAsync({ event: sendingEvent, payload: 123 }));
  bench.add('nrgy Signal sync', () => nrgySignalSync({ event: sendingEvent, payload: 123 }));
  bench.add('rxjs Subject', () => subject.next({ event: sendingEvent, payload: 123 }));
  bench.add('rx-effects Action', () => rxEffectsAction({ event: sendingEvent, payload: 123 }));

  await bench.run();
 
  // clear data
  transportSync.destroy()
  transportAsync.destroy()

  destroysNrgySync.forEach((destroy) => destroy());
  destroysNrgySync = [];

  destroysNrgyAsync.forEach((destroy) => destroy());
  destroysNrgyAsync = [];

  destroyRxSubject.forEach((destroy) => destroy());
  destroyRxSubject = [];

  destroyRxEffectAction.forEach((destroy) => destroy());
  destroyRxEffectAction = [];

  return bench;
}
