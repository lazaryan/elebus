import { Bench } from 'tinybench';

import { createTransport } from '../dist/elebus';

main();

async function main(): Promise<void> {
  const bench = new Bench();

  bench.add('create root node', () => createTransport());

  await bench.run();
  console.table(bench.table());
}