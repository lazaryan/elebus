import { signal, effect } from 'nrgy';
import { Subject } from 'rxjs';
import { createAction } from 'rx-effects';
import { Bench } from 'tinybench';

import { createTransport, createSubscribeNode } from '../dist';

export async function benchSubscribeNodeToNode(): Promise<Bench> {
  const bench = new Bench({
    name: 'subscribe node to node',
    time: 100,
    setup: (_task, mode) => {
      // Run the garbage collector before warmup at each cycle
      if (mode === 'warmup' && typeof globalThis.gc === 'function') {
        globalThis.gc();
      }
    },
  });

  let node1 = createSubscribeNode();
  bench.add(
    'elebus add root to "" namespace',
    () => node1.add('', createTransport()),
    {
      afterAll: () => {
        node1.destroy();
        node1 = createSubscribeNode();
      }
    }
  );

  let node2 = createSubscribeNode<{ 'namespace:event': any }>();
  bench.add(
    'elebus add root to "namespace" namespace',
    () => node2.add('namespace', createTransport()),
    {
      afterAll: () => {
        node2.destroy();
        node2 = createSubscribeNode<{ 'namespace:event': any }>();
      }
    }
  );

  const signalRoot = signal();
  bench.add(
    'nrgy signal',
    () => effect(signalRoot, signal()),
  );

  let subjectRoot = new Subject();
  bench.add(
    'rx subject',
    () => subjectRoot.subscribe(new Subject().next),
    {
      afterAll: () => {
        subjectRoot.complete();
        subjectRoot = new Subject();
      }
    }
  );

  let actionRoot = createAction();
  bench.add(
    'rx-effects action',
    () => actionRoot.event$.subscribe(createAction()),
  );

  await bench.run();
  return bench;
}
