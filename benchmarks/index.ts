import { signal as nrgySignal, effect as nrgyEffect } from 'nrgy';
import { Bench } from 'tinybench';

import { createTransport } from '../dist/elebus';

main();

function factorial(n: number) {
  return (n != 1) ? n * factorial(n - 1) : 1;
}

const FACTORIAL_TEST_SIZE = 8;

async function main(): Promise<void> {
  const benchElebus = await benchRootTransport();
  const benchNrgy = await benchSignal();

  console.log(`======= ${benchElebus.name} =======`);
  console.table(benchElebus.table());

  console.log(`======= ${benchNrgy.name} =======`);
  console.table(benchNrgy.table());
}

async function benchRootTransport(): Promise<Bench> {
  const bench = new Bench({
    time: 200,
    name: 'root node',
  });

  const transport = createTransport<{ event: undefined, unknown_event: number }>();
  bench.add('create root node', () => createTransport());

  bench.add('subscribe to root node', () => transport.on('event', () => factorial(FACTORIAL_TEST_SIZE)));

  bench.add('async sending events that are not subscribed to', () => transport.send('unknown_event', 123));
  bench.add('sync sending events that are not subscribed to', () => transport.send('unknown_event', 123, { sync: true }));

  bench.add('async send event', () => transport.send('event'));
  bench.add('sync send event', () => transport.send('event', undefined, { sync: true }));

  await bench.run();
  return bench;
}

async function benchSignal(): Promise<Bench> {
  const bench = new Bench({
    time: 200,
    name: 'nrgy signal',
  });

  const signalAsync = nrgySignal<'event' | 'unknown_event'>();
  const signalSync = nrgySignal<'event' | 'unknown_event'>({ sync: true });
  bench.add('create signal', () => nrgySignal());

  bench.add('subscribe to signal (async)', () => nrgyEffect(signalAsync, (event) => {
    if (event === 'event') {
      factorial(FACTORIAL_TEST_SIZE)
    }
  }));
  bench.add('subscribe to signal (sync)', () => nrgyEffect(signalSync, (event) => {
    if (event === 'event') {
      factorial(FACTORIAL_TEST_SIZE)
    }
  }));

  bench.add('async sending events that are not subscribed to', () => signalAsync('unknown_event'));
  bench.add('sync sending events that are not subscribed to', () => signalSync('unknown_event'));

  bench.add('async send event', () => signalAsync('event'));
  bench.add('sync send event', () => signalSync('event'));

  await bench.run();
  return bench;
}