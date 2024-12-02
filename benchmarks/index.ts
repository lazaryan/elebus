import { benchCreateNodes } from './createNodes';
import { benchSendEvent } from './sendEvents';
import { benchSendEventWithTree } from './sendTreeEvents';
import { benchSubscribe } from './subscribe';
import { benchSubscribeNodeToNode } from './subscribeNodeToNode';

main();

async function main(): Promise<void> {
  const createNodes = await benchCreateNodes();
  console.log(`======= ${createNodes.name} =======`);
  console.table(createNodes.table());

  await waitTime(10_000);

  const subscribe = await benchSubscribe();
  console.log(`======= ${subscribe.name} =======`);
  console.table(subscribe.table());

  await waitTime(10_000);

  const subscrubeNodeToNode = await benchSubscribeNodeToNode();
  console.log(`======= ${subscrubeNodeToNode.name} =======`);
  console.table(subscrubeNodeToNode.table());

  await waitTime(10_000);

  const sendUnknownEvent = await benchSendEvent(false);
  console.log(`======= ${sendUnknownEvent.name} =======`);
  console.table(sendUnknownEvent.table());

  await waitTime(10_000);

  const sendEvent = await benchSendEvent(true);
  console.log(`======= ${sendEvent.name} =======`);
  console.table(sendEvent.table());

  for (let treeLevel = 1; treeLevel <= 2; treeLevel++) {
    await waitTime(10_000);

    const sendTreeUnknownEvent = await benchSendEventWithTree(false, treeLevel);
    console.log(`======= ${sendTreeUnknownEvent.name} =======`);
    console.table(sendTreeUnknownEvent.table());

    await waitTime(10_000);

    const sendTreeEvent = await benchSendEventWithTree(true, treeLevel);
    console.log(`======= ${sendTreeEvent.name} =======`);
    console.table(sendTreeEvent.table());
  }
}

async function waitTime(timeout = 0): Promise<void> {
  return await new Promise((resolve) =>
    setTimeout(() => resolve(undefined), timeout),
  );
}
