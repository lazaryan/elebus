import { signal as nrgySignal, effect as nrgyEffect } from 'nrgy';
import { Bench } from 'tinybench';

import { createTransport } from '../dist';

const FACTORIAL_TEST_SIZE = 8;
const SUBSCRIBERS_COUNT = 1_000;
const BENCH_TIME = 200;

function factorial(n: number) {
  return (n != 1) ? n * factorial(n - 1) : 1;
}

main();

async function main(): Promise<void> {
  const benchRootElebus = await benchRootTransport();
  const benchRootReadonlyElebus = await benchRootReadonlyTransport();

  const benchNrgy = await benchSignal();

  console.log(`======= ${benchRootElebus.name} =======`);
  console.table(benchRootElebus.table());

  console.log(`======= ${benchRootReadonlyElebus.name} =======`);
  console.table(benchRootReadonlyElebus.table());

  console.log(`======= ${benchNrgy.name} =======`);
  console.table(benchNrgy.table());
}

async function benchRootTransport(): Promise<Bench> {
  const bench = new Bench({
    time: BENCH_TIME,
    name: 'elebus root node',
  });

  const transportSync = createTransport<{ event: undefined, unknown_event: number }>({ sync: true });
  const transportAsync = createTransport<{ event: undefined, unknown_event: number }>();
  bench.add('create root node', () => createTransport());

  const subscribeTestTransport = createTransport<{ event: undefined, unknown_event: number }>();
  bench.add('subscribe to root node', () => subscribeTestTransport.on('event', () => factorial(FACTORIAL_TEST_SIZE)));
  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    transportSync.on('event', () => factorial(FACTORIAL_TEST_SIZE));
    transportAsync.on('event', () => factorial(FACTORIAL_TEST_SIZE));
  }

  bench.add('async sending events that are not subscribed to', () => transportAsync.send('unknown_event', 123));
  bench.add('sync sending events that are not subscribed to', () => transportSync.send('unknown_event', 123));

  bench.add('async send event', () => transportAsync.send('event'));
  bench.add('sync send event', () => transportSync.send('event', undefined));

  await bench.run();

  transportSync.destroy();
  transportAsync.destroy();
  subscribeTestTransport.destroy();

  return bench;
}

async function benchRootReadonlyTransport(): Promise<Bench> {
  const bench = new Bench({
    time: BENCH_TIME,
    name: 'elebus root readonly node',
  });

  const transportSync = createTransport<{ event: undefined, unknown_event: number }>({ sync: true });
  const transportAsync = createTransport<{ event: undefined, unknown_event: number }>();

  const transportSyncReadonly = transportSync.asReadonly();
  const transportAsyncReadonly = transportSync.asReadonly();
  bench.add('create readonly node', () => transportSync.asReadonly());

  const subscribeTestTransport = createTransport<{ event: undefined, unknown_event: number }>();
  const subscribeTestTransportReadonly = subscribeTestTransport.asReadonly();

  bench.add('subscribe to root node', () => subscribeTestTransportReadonly.on('event', () => factorial(FACTORIAL_TEST_SIZE)));
  for (let i = 0; i <= SUBSCRIBERS_COUNT; i++) {
    transportSyncReadonly.on('event', () => factorial(FACTORIAL_TEST_SIZE));
    transportAsyncReadonly.on('event', () => factorial(FACTORIAL_TEST_SIZE));
  }

  bench.add('async sending events that are not subscribed to', () => transportAsync.send('unknown_event', 123));
  bench.add('sync sending events that are not subscribed to', () => transportSync.send('unknown_event', 123));

  bench.add('async send event', () => transportAsync.send('event'));
  bench.add('sync send event', () => transportSync.send('event', undefined));

  await bench.run();

  transportSync.destroy();
  transportAsync.destroy();
  subscribeTestTransport.destroy();
  
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