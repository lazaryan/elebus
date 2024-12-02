import { signal, effect } from 'nrgy';
import { Subject } from 'rxjs';
import { createAction } from 'rx-effects';
import { Bench } from 'tinybench';

import { createTransport, createSubscribeNode } from '../dist';

export async function benchSubscribe(): Promise<Bench> {
  const bench = new Bench({
    name: 'subscribe',
    time: 100,
    setup: (_task, mode) => {
      // Run the garbage collector before warmup at each cycle
      if (mode === 'warmup' && typeof globalThis.gc === 'function') {
        globalThis.gc();
      }
    },
  });
  bench.threshold = 10_000;

  let transportOn1 = createTransport();
  bench.add(
    'elebus root "on"',
    () => transportOn1.on('event', () => {}),
    {
      beforeAll: () => {
        transportOn1 = createTransport();
      },
      afterAll: () => {
        transportOn1.destroy();
      }
    }
  );
  let transportOnce1 = createTransport();
  bench.add(
    'elebus root "once"',
    () => transportOnce1.once('event', () => {}),
    {
      beforeAll: () => {
        transportOnce1 = createTransport();
      },
      afterAll: () => {
        transportOnce1.destroy();
      }
    }
  );

  let transport1 = createTransport();
  let subscruberOn = createSubscribeNode({ roots: { '': [transport1] } });
  bench.add(
    'elebus subscruber "on"',
    () => subscruberOn.on('event', () => {}),
    {
      beforeAll: () => {
        transport1 = createTransport();
        subscruberOn = createSubscribeNode({ roots: { '': [transport1] } });
      },
      afterAll: () => {
        subscruberOn.destroy();
        transport1.destroy();
      }
    }
  );

  let transport2 = createTransport();
  let subscruberOnce = createSubscribeNode({ roots: { '': [transport2] } });
  bench.add(
    'elebus subscruber "once"',
    () => subscruberOnce.once('event', () => {}),
    {
      beforeAll: () => {
        transport2 = createTransport();
        subscruberOnce = createSubscribeNode({ roots: { '': [transport2] } });
      },
      afterAll: () => {
        subscruberOnce.destroy();
        transport2.destroy();
      }
    }
  );

  let transport3 = createTransport();
  let subscruberWithNamespaceOn = createSubscribeNode({ roots: { 'namespace': [transport3] } });
  bench.add(
    'elebus subscruber with namespace "on"',
    () => subscruberWithNamespaceOn.on('namespace:event', () => {}),
    {
      beforeAll: () => {
        transport3 = createTransport();
        subscruberWithNamespaceOn = createSubscribeNode({ roots: { 'namespace': [transport3] } });
      },
      afterAll: () => {
        subscruberWithNamespaceOn.destroy();
        transport3.destroy();
      }
    }
  );

  let transport4 = createTransport();
  let subscruberWithNamespaceOnce = createSubscribeNode({ roots: { 'namespace': [transport4] } });
  bench.add(
    'elebus subscruber with namespace "once"',
    () => subscruberWithNamespaceOnce.on('namespace:event', () => {}),
    {
      beforeAll: () => {
        transport4 = createTransport();
        subscruberWithNamespaceOnce = createSubscribeNode({ roots: { 'namespace': [transport4] } });
      },
      afterAll: () => {
        subscruberWithNamespaceOnce.destroy();
        transport4.destroy();
      }
    }
  );

  const nrgySignal = signal();
  bench.add('nrgy Signal', () => effect(nrgySignal, () => {}));

  let subject = new Subject();
  bench.add(
    'rx Subject',
    () => subject.subscribe(() => {}),
    {
      beforeAll: () => {
        subject = new Subject();
      },
      afterAll: () => {
        subject.complete();
      }
    }
  );

  let rxEffectsAction = createAction();
  bench.add(
    'rx-effects Action',
    () => rxEffectsAction.event$.subscribe(() => {}),
    {
      beforeAll: () => {
        rxEffectsAction = createAction();
      }
    }
  );

  await bench.run();
  return bench;
}