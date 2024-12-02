import { signal, effect, Signal } from 'nrgy';
import { Subject } from 'rxjs';
import { Action, createAction } from 'rx-effects';
import { Bench } from 'tinybench';

import { createTransport, createSubscribeNode, TransportRoot, SubscribeNode } from '../dist';

const SUBSCRIBERS_COUNT = 1_000;

export async function benchSendEventWithTree(isSubscribers: boolean, level = 1): Promise<Bench> {
  const bench = new Bench({
    time: 200,
    name:
      'sending root'
      + Array.from({ length: level }).fill(' => node').join('')
      + ' => subscriber '
      + (isSubscribers
        ? 'an event to which you are subscribed'
        : 'an event that is not subscribed to'
      ),
    setup: (_task, mode) => {
      // Run the garbage collector before warmup at each cycle
      if (mode === 'warmup' && typeof globalThis.gc === 'function') {
        globalThis.gc();
      }
    },
  });
  bench.threshold = 10_000;

  const sendingEvent = isSubscribers ? 'event' : 'unknown_event';

  let transportAsync = createTransport({ sync: false });
  let nodeAsync = createTreeTransport(transportAsync, '', level);
  bench.add(
    'elebus async',
    () => transportAsync.send(sendingEvent, 123),
    {
      beforeAll: () => {
        transportAsync = createTransport({ sync: false });
        nodeAsync = createTreeTransport(transportAsync, '', level);
        for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
          nodeAsync.on('event', () => {});
        }
      },
      afterAll: () => {
        transportAsync.destroy();
        nodeAsync.destroy();
      }
    }
  );


  let transportSync = createTransport({ sync: true });
  let nodeSync = createTreeTransport(transportSync, '', level);
  bench.add(
    'elebus sync',
    () => transportSync.send(sendingEvent, 123),
    {
      beforeAll: () => {
        transportSync = createTransport({ sync: false });
        nodeSync = createTreeTransport(transportAsync, '', level);
        for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
          nodeSync.on('event', () => {});
        }
      },
      afterAll: () => {
        transportSync.destroy();
        nodeSync.destroy();
      }
    }
  );

  let nrgySignalAsync = signal<{ event: string; payload: number }>({ sync: false });
  let nrgySignalNodeAsync = createTreeNrgySignal(nrgySignalAsync, level);
  const destroysNrgyAsync: Set<() => void> = new Set();
  bench.add(
    'nrgy Signal async',
    () => nrgySignalAsync({ event: sendingEvent, payload: 123 }),
    {
      beforeAll: () => {
        nrgySignalAsync = signal<{ event: string; payload: number }>({ sync: false });
        nrgySignalNodeAsync = createTreeNrgySignal(nrgySignalAsync, level);
        for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
          destroysNrgyAsync.add(effect(nrgySignalNodeAsync, ({ event }) => { if (event === 'event') {} }).destroy);
        }
      },
      afterAll: () => {
        destroysNrgyAsync.forEach((destroy) => destroy());
        destroysNrgyAsync.clear();
      }
    }
  );

  let nrgySignalSync = signal<{ event: string; payload: number }>({ sync: true });
  let nrgySignalNodeSync = createTreeNrgySignal(nrgySignalSync, level);
  let destroysNrgySync: Set<() => void> = new Set();
  bench.add(
    'nrgy Signal sync',
    () => nrgySignalSync({ event: sendingEvent, payload: 123 }),
    {
      beforeAll: () => {
        nrgySignalSync = signal<{ event: string; payload: number }>({ sync: true });
        nrgySignalNodeSync = createTreeNrgySignal(nrgySignalSync, level);
        for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
          destroysNrgySync.add(effect(nrgySignalNodeSync, ({ event }) => { if (event === 'event') {} }).destroy);
        }
      },
      afterAll: () => {
        destroysNrgySync.forEach((destroy) => destroy());
        destroysNrgySync.clear();
      }
    }
  );
  
  let rxEffectsAction = createAction<{ event: string; payload: number }>();
  let rxEffectsNodeAction = createTreeRxEffectsAction(rxEffectsAction, level);
  const destroyRxEffectAction: Set<() => void> = new Set();
  bench.add(
    'rx-effects Action',
    () => rxEffectsAction({ event: sendingEvent, payload: 123 }),
    {
      beforeAll: () => {
        rxEffectsAction = createAction<{ event: string; payload: number }>();
        rxEffectsNodeAction = createTreeRxEffectsAction(rxEffectsAction, level);

        for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
          const rxSubscriber = rxEffectsNodeAction.event$.subscribe(({ event }) => { if (event === 'event') {} })
          destroyRxEffectAction.add(() => {
            if (!rxSubscriber.closed) {
              rxSubscriber.unsubscribe();
            }
          });
        }
      },
      afterAll: () => {
        destroyRxEffectAction.forEach((unsubscriber) => unsubscriber());
        destroyRxEffectAction.clear();
      }
    }
  );

  await bench.run();
  return bench;
}

function createTreeTransport(transport: TransportRoot<any>, namespace = '', level = 1): SubscribeNode<any> {
  const node1 = createSubscribeNode({ roots: { [namespace]: [transport] } });
  if (level <= 1) return node1;

  let resultNode = node1;
  for (let i = 1; i < level; i++) {
    resultNode = createSubscribeNode({ roots: { [namespace]: [resultNode] } });
  }

  return resultNode;
}

function createTreeNrgySignal(root: Signal<any>, level = 1): Signal<any> {
  const newSignal = signal();
  effect(root, newSignal);
  if (level <= 1) return newSignal;

  let resultNode = newSignal;
  for (let i = 1; i < level; i++) {
    const node = signal();
    effect(resultNode, node);
    resultNode = node;
  }

  return resultNode;
}

function createTreeRxEffectsAction(root: Action<any>, level = 1): Action<any> {
  const newAction = createAction();
  root.event$.subscribe(newAction);
  if (level <= 1) return newAction;

  let resultNode = newAction;
  for (let i = 1; i < level; i++) {
    const node = createAction();
    resultNode.event$.subscribe(node);
    resultNode = node;
  }

  return resultNode; 
}
