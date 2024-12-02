import { signal } from 'nrgy';
import { Subject } from 'rxjs';
import { createAction } from 'rx-effects';
import { Bench } from 'tinybench';

import { createTransport, createSubscribeNode } from '../dist';

export async function benchCreateNodes(): Promise<Bench> {
  const bench = new Bench({
    name: 'create node',
    time: 500,
  });

  bench.add('elebus root node', () => createTransport());
  bench.add('elebus child node', () => createSubscribeNode());

  bench.add('nrgy create signal', () => signal());
  bench.add('rxjs create Subject', () => new Subject());
  bench.add('rx-effects create Action', () => createAction());

  await bench.run();
  return bench;
}