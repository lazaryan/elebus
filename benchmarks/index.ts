import { signal as nrgySignal, effect as nrgyEffect } from 'nrgy';
import { Bench } from 'tinybench';

import { createTransport, createNode } from '../dist/elebus';

const FACTORIAL_TEST_SIZE = 8;
const SUBSCRIBERS_COUNT = 1_000;
const BENCH_TIME = 200;

main();

function factorial(n: number) {
  return (n != 1) ? n * factorial(n - 1) : 1;
}

async function main(): Promise<void> {
  const benchRootElebus = await benchRootTransport();
  const benchNrgy = await benchSignal();

  const benchNodeElebus = await benchNodeTransport();
  const benchNrgyMiddle = await benchSignalMiddle();

  console.log(`======= ${benchRootElebus.name} =======`);
  console.table(benchRootElebus.table());

  console.log(`======= ${benchNrgy.name} =======`);
  console.table(benchNrgy.table());

  console.log(`======= ${benchNodeElebus.name} =======`);
  console.table(benchNodeElebus.table());

  console.log(`======= ${benchNrgyMiddle.name} =======`);
  console.table(benchNrgyMiddle.table());
}

async function benchRootTransport(): Promise<Bench> {
  const bench = new Bench({
    time: BENCH_TIME,
    name: 'elebus root node',
  });

  const transport = createTransport<{ event: undefined, unknown_event: number }>();
  bench.add('create root node', () => createTransport());

  const subscribeTestTransport = createTransport<{ event: undefined, unknown_event: number }>();
  bench.add('subscribe to root node', () => subscribeTestTransport.on('event', () => factorial(FACTORIAL_TEST_SIZE)));
  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    transport.on('event', () => factorial(FACTORIAL_TEST_SIZE));
  }

  bench.add('async sending events that are not subscribed to', () => transport.send('unknown_event', 123));
  bench.add('sync sending events that are not subscribed to', () => transport.send('unknown_event', 123, { sync: true }));

  bench.add('async send event', () => transport.send('event'));
  bench.add('sync send event', () => transport.send('event', undefined, { sync: true }));

  await bench.run();
  return bench;
}

async function benchNodeTransport(): Promise<Bench> {
  const bench = new Bench({
    name: 'elebus child node',
    time: BENCH_TIME,
  });

  const transport = createTransport<{ event: undefined, unknown_event: number }>();
  const transport2 = createTransport<{ event: undefined, unknown_event: number }>();
  const node = createNode().watch(transport, '');
  const nodeTestSubscribe = createNode().watch(transport2, '');
  bench.add('create node', () => createNode());

  bench.add('subscribe to root node', () => nodeTestSubscribe.on('event', () => factorial(FACTORIAL_TEST_SIZE)));
  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    node.on('event', () => factorial(FACTORIAL_TEST_SIZE));
  }

  bench.add('async sending events that are not subscribed to', () => transport.send('unknown_event', 123));
  bench.add('sync sending events that are not subscribed to', () => transport.send('unknown_event', 123, { sync: true }));

  bench.add('async send event', () => transport.send('event'));
  bench.add('sync send event', () => transport.send('event', undefined, { sync: true }));

  await bench.run();
  return bench;
}

async function benchSignal(): Promise<Bench> {
  const bench = new Bench({
    time: BENCH_TIME,
    name: 'nrgy signal',
  });

  const signalAsync = nrgySignal<'event' | 'unknown_event'>();
  const signalSync = nrgySignal<'event' | 'unknown_event'>({ sync: true });
  bench.add('create signal', () => nrgySignal());

  const sibscribeTestSignal = nrgySignal<'event' | 'unknown_event'>();
  bench.add('subscribe to signal', () => nrgyEffect(sibscribeTestSignal, (event) => {
    if (event === 'event') {
      factorial(FACTORIAL_TEST_SIZE)
    }
  }));
  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    nrgyEffect(signalAsync, (event) => {
      if (event === 'event') {
        factorial(FACTORIAL_TEST_SIZE)
      }
    })
    nrgyEffect(signalSync, (event) => {
      if (event === 'event') {
        factorial(FACTORIAL_TEST_SIZE)
      }
    })
  }

  bench.add('async sending events that are not subscribed to', () => signalAsync('unknown_event'));
  bench.add('sync sending events that are not subscribed to', () => signalSync('unknown_event'));

  bench.add('async send event', () => signalAsync('event'));
  bench.add('sync send event', () => signalSync('event'));

  await bench.run();
  return bench;
}

async function benchSignalMiddle(): Promise<Bench> {
  const bench = new Bench({
    time: BENCH_TIME,
    name: 'nrgy signal with middle sender',
  });

  const signalAsyncRoot = nrgySignal<'event' | 'unknown_event'>();
  const signalSyncRoot = nrgySignal<'event' | 'unknown_event'>({ sync: true });

  const signalAsync = nrgySignal<'event' | 'unknown_event'>();
  const signalSync = nrgySignal<'event' | 'unknown_event'>({ sync: true });

  nrgyEffect(signalAsyncRoot, signalAsync);
  nrgyEffect(signalSyncRoot, signalSync);

  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    nrgyEffect(signalAsync, (event) => {
      if (event === 'event') {
        factorial(FACTORIAL_TEST_SIZE)
      }
    })
    nrgyEffect(signalSync, (event) => {
      if (event === 'event') {
        factorial(FACTORIAL_TEST_SIZE)
      }
    })
  }

  bench.add('async sending events that are not subscribed to', () => signalAsyncRoot('unknown_event'));
  bench.add('sync sending events that are not subscribed to', () => signalSyncRoot('unknown_event'));

  bench.add('async send event', () => signalAsyncRoot('event'));
  bench.add('sync send event', () => signalSyncRoot('event'));

  await bench.run();
  return bench;
}
