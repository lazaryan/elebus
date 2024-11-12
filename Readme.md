# Elebus

JavaScript Elebus library for creating a tree-like event bus

## Overview

The library consists of 2 nodes:

1) root nodes
2) nodes

### Root node

root nodes are responsible for subscriptions and sending messages.
You can create a node as follows:

```ts
type Events = { event: number };
const transport = createTransport<Events>();
```

To clean up the class, use the `destroy` method, which will perform all unsubscriptions and clear the data.
After calling destroy, subscriptions and sending messages will not work.

There are 2 formats for subscribing to events: `on`/`once` or `addEventListener`.
You can subscribe to a specific event or to all at once, specifying `'*'` instead of the event name.
The methods return functions for unsubscribing from an event. Examples:

```ts
type Events = { event1: number, event2: number };
const transport = createTransport<Events>();

transport.on('event1', (event, payload) => {});
transport.once('event1', (event, payload) => {});
const unsubscriber = transport.addEventListener('*', (event, payload) => {});

unsubscriber();
```

You can also use the `off` and `removeEventListener` methods to unsubscribe from an event

```ts
type Events = { event1: number, event2: number };
const transport = createTransport<Events>();

function handler(event, payload): void { }

transport.on('event1', handler);
transport.off('event1', handler);

transport.addEventListener('event1', handler);
transport.removeEventListener('event1', handler);
```

The `send` method is used to send messages.
If no one is subscribed to the event and there are no subscribers to all events (*), then the method does nothing.
It also does not forward messages after destruction.

```ts
type Events = { event1: number, event2: undefined };
const transport = createTransport<Events>();

transport.on('event1', () => {});
transport.on('event2', () => {});

transport.send('event1', 123);
transport.send('event2'); // because event payload type === undefined
transport.send('event2', undefined);
```

By default, sending events is asynchronous. This behavior can be changed by passing a third argument

```ts
transport.send('event1', 123, { sync: true });
transport.send('event2', undefined, { sync: true });
```

If you want the root node to be available in `readOnly mode` (without sending),
for example outside the service, use the `asReadonly` method (It creates a child node which will be described below):

```ts
function myService() {
  const transport = createTransport();

  return {
    events: transport.asReadonly(), // not has send method
  }
}
```

To track the life cycle of the root node during initialization, you can pass callbacks:

1) onDestroy - track node cleanup
2) onSubscriber - called when subscribing to an event. Takes 2 arguments: the event name and whether the subscription is the first.
2) onUnsubscriber - called when unsubscribing from an event. Takes 2 arguments: the event name and whether there are any more subscribers to this event.

```ts
type Events = { event: number };
const transport = createTransport({
  name: 'transport name',
  onDestroy: () => console.log('destroy class'),
  onSubscribe: (event, isFirst) => console.log('subscribe', event, isFirst),
  onUnsubscribe: (event, isHasSubscribers) => console.log('unsubscribe', event, isHasSubscribers),
});

const unsubscribe1 = transport.on('event', () => {}); // subscribe event true
const unsubscribe2 = transport.on('event', () => {}); // subscribe event false

unsubscribe1(); // unsubscribe event true
unsubscribe2(); // unsubscribe event false

transport.destroy(); // destroy class
```

### Child Node

Used to combine multiple root nodes by namespaces and to conveniently subscribe to them.

Namespaces are automatically substituted into types,
which guarantees the disjointness of several events from different transports
(when we have 2 transports with the same event names).

Nodes implement the concept of an abstract tree.
When creating child nodes, they do not refer to previous participants in the chain,
but directly to the root nodes that are at the top of the subscription chain.

When calling `root.asReadonly()`, a node is created.
It can also be created using the `createNode` function:

```ts
const root = createTransport();

const readonlyRootNode = root.asReadonly();
const baseNode = createNode();
```

To clean up the class, use the `destroy` method, which will perform all unsubscriptions and clear the data.
After calling destroy, subscriptions will not work.

Nodes are used exclusively for subscriptions to root nodes.
They do not have methods for sending events.

To create a subscription to a root node, you can use the watch method,which creates a new node.
The method accepts a transport and a namespace through which it will be accessed.
If an empty namespace is passed, the event names will not be modified.
If a child node other than the root is passed as a node, all subscriptions of this node will be taken.

```ts
type Events1 = { event1: number }
type Events2 = { event2: number }
type Events3 = { event3: number }

const root1 = createTransport<Events1>();
const root2 = createTransport<Events2>();
const root3 = createTransport<Events3>();

const node = createNode()
  .watch(root1, 'n1') // { 'n1:event1': number }
  .watch(root2, 'n2') // { 'n1:event1': number; 'n2:event2': number }
  .watch(root3, '') // { event3: number; 'n1:event1': number; 'n2:event2': number }

const node2 = createNode()
  .watch(root1, 'n1') // { 'n1:event1': number }
  .watch(node, '') // { event: number3; 'n1:event1': number; 'n2:event2': number }
```

To access the root nodes referenced by a node there is a method `getWatchedTransports`:

```ts
const root1 = createTransport();
const root2 = createTransport();
const root3 = createTransport();

const node = createNode()
  .watch(root1, 'n1')
  .watch(root2, 'n2')
  .watch(root3, 'n2')

node.getWatchedTransports() // Map({ 'n1': Set([root1]), 'n2': Set([root2, root3]) })
```

It is also possible to subscribe to several root nodes at once without multiple calls to the `watch` method.
To do this, use the `watchTransports` method, which accepts a list of nodes as both a map and an object:

```ts
const root1 = createTransport();
const root2 = createTransport();
const root3 = createTransport();

const node1 = createNode().watchTransports({
  '': new Set([root1]),
  'n1': new Set([root2, root3])
});
const node2 = createNode().watchTransports(new Map(
  ['', new Set([root1])],
  ['n1', new Set([root2, root3])],
));
```

If there is a need for type casting, there is the `as` method, which returns the same instance, but with the required type.

If, on the contrary, we want to extract the nodes we need from the common bus, we can use the `channel` method:

```ts
type Events1 = { event1: number }
type Events2 = { event2: number }
type Events3 = { event3: number }

const root1 = createTransport<Events1>();
const root2 = createTransport<Events2>();
const root3 = createTransport<Events3>();

const node = createNode()
  .watch(root1, 'n1') // { 'n1:event1': number }
  .watch(root2, 'n2') // { 'n1:event1': number; 'n2:event2': number }
  .watch(root3, '') // { event3: number; 'n1:event1': number; 'n2:event2': number }

const nodeToN1 = node.channel('n1') // { 'event1': number }
const nodeToN1 = node.channel('') // { 'event3': number }
```

Subscriptions and unsubscriptions use the same methods as the root node, but the type is a template string. The following subscription formats are available:

1) '*' - subscribe to all events of all root nodes
2) event - subscribe to the event `event` of nodes that are in namespace === ''
3) namespace:* - subscribe to all events of nodes under namespace
4) namespace:event - subscribe to the event `event` inside namespace

```ts
type Events1 = { event1: number }
type Events2 = { event2: number }
type Events3 = { event3: number }

const root1 = createTransport<Events1>();
const root2 = createTransport<Events2>();
const root3 = createTransport<Events3>();

const node = createNode()
  .watch(root1, 'n1') // { 'n1:event1': number }
  .watch(root2, 'n2') // { 'n1:event1': number; 'n2:event2': number }
  .watch(root3, '') // { event3: number; 'n1:event1': number; 'n2:event2': number }

const node1 = createNode().watch(root1, 'n1') // { 'n1:event1': number }
const node2 = createNode().watch(node1, 'n2') // { 'n2:n1:event1': number }

node.on('*', () => {}) // all events
node.on('event3', () => {}); // event3
node.on('n1:*', () => {}); // n1:event1
node.on('n1:event1', () => {}); // n1:event1

node2.on('*', () => {}) // all events
node2.on('n2:*', () => {})
node2.on('n2:n1:*', () => {})
node2.on('n2:n1:event1', () => {})
```
