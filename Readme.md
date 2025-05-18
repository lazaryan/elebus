# Elebus

JavaScript Elebus library for creating a tree-like event bus

## Installation

You can use the following command to install packages:

```
npm install --save elebus
```

## Overview

The library consists of 2 nodes:

1) root nodes
2) nodes

### Transport root node

root nodes are responsible for subscriptions and sending messages.
You can create a node as follows:

```ts
type Events = { event: number };
const transport = createTransport<Events>({ name: 'root node' });
```

Event format: `type EventLike = Record<string, unknown>`

To clean up the class, use the `destroy` method, which will perform all unsubscriptions and clear the data.
After calling destroy, subscriptions and sending messages will not work.

To determine that a node has already been destroyed in a transport, there is a property `isDestroyed`

```ts
type Events = { event: number };
const transport = createTransport<Events>({
  name: 'root node with lifecycle',
});

transport.on('event', () => console.log('event call'));
transport.isDestroyed // false

transport.destroy();
transport.isDestroyed // true
transport.send('event', 123); // not call because transport is destroyed
```

There are 2 functions for subscribing to events:
1) on - listens to events until manual unsubscription is performed.
2) once - unsubscribes automatically after the first required event.

You can subscribe to a specific event or to all at once, specifying `'*'` instead of the event name.
The methods return functions for unsubscribing from an event. Examples:

```ts
type Events = { event1: number, event2: number };
const transport = createTransport<Events>({
  name: 'root node with subscribers',
});

transport.on('*', (event, payload) => {});
transport.on('event1', (event, payload) => {});
const unsubscriber = transport.once('event1', (event, payload) => {});

unsubscriber();
```

You can also use the `off` methods to unsubscribe from an event

```ts
type Events = { event1: number, event2: number };
const transport = createTransport<Events>();

function handler1(event, payload): void { }
function handler2(event, payload): void { }

transport.on('event1', handler1);
transport.off('event1', handler1);

transport.once('event1', handler2);
transport.off('event1', handler2);
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
transport.send('event2', undefined);
```

By default, sending events is asynchronous.
To make events send synchronously, you can pass the `sync: true` property when initializing the transport.

```ts
type Events = { event1: number, event2: undefined };
const transport = createTransport<Events>({ sync: true });
// sync call all subscribers
transport.send('event1', 123);
transport.send('event2', undefined);
```

If you want the root node to be available in `readonly mode` (without methods for sending events and destroying),
for example when exporting a transport from a service, use the `asReadonly` method.

This method will return a wrapper over the original node
and leave only the methods for subscriptions and unsubscriptions publicly available.

```ts
function myService() {
  const transport = createTransport({ name: 'service transport' });

  return {
    events: transport.asReadonly(), // not has send and destroy method
  }
}
```

To track the life cycle of a node, there is a property called `lifecycle`,
which is a minimal event bus that sends the following events:

1) destroy - Root node is destroyed.
2) subscribe - The node was subscribed to.
The number of subscribers is passed to the event and what type of subscriber it was: on or once.
3) unsubscribe - The node has been unsubscribed.
The event is passed the number of remaining subscribers to this event and what type of subscriber it was: on or once.

```ts
type Events = { test_event: number };
const transport = createTransport({ name: 'transport name' });

transport.lifecycle.on('destroy', () => {
  console.log('destroy node');
});
transport.lifecycle.on('subscribe', ({ event, subscribersCount }) => {
  console.log(`subscribe ${event} ${subscribersCount}`);
});
transport.lifecycle.on('unsubscribe', ({ event, subscribersCount }) => {
  console.log(`unsubscribe ${event} ${subscribersCount}`);
});

const unsubscribe1 = transport.on('test_event', () => {});
// console log: subscribe test_event 1
const unsubscribe2 = transport.on('test_event', () => {});
// console log: subscribe test_event 2

unsubscribe1();
// console log: unsubscribe test_event 1
unsubscribe2();
// console log: unsubscribe test_event 0

transport.destroy(); // console log: destroy node
```

When the main node is destroyed, the lifecycle is also destroyed.

If you need to access transport in several places in your application,
you can pass the `shared` parameter during initialization.
In this case, the transport will be cached, and the next time a creation request is made with the same settings,
not a new transport will be created, but one returned from the cache.

```ts
const transport1 = createTransport<{ event: undefined }>({ name: 'sharedTransport', shared: true });
const transport2 = createTransport<{ event: undefined }>({ name: 'sharedTransport', shared: true });

// transport1 === transport2
transport2.on('event', () => console.log('____event____'))
transport1.send('event');
// ____event____
```

### Subscribe Node

Child nodes are used to combine root nodes into a single bus to allow subscription to several nodes at once,
as well as to specific ones.
The unification of root nodes occurs by namespace.

Nodes implement the concept of an abstract tree,
instead of a physical one, which means that a new node does not directly refer to the entire subscription chain,
but through an alias (merge of namespaces) directly refers to all root nodes that participate in the subscription chain.

This slightly increases the subscription time,
but the length of the subscription chain will not affect the speed and complexity of sending the events themselves.

To create a node, use the `createSubscribeNode` function.

```ts
const baseNode = createSubscribeNode();
```

To clean up the class, use the `destroy` method, which will perform all unsubscriptions and clear the data.
After calling destroy, subscriptions will not work.

Nodes are used exclusively for subscriptions to root nodes.
They do not have methods for sending events.

There are 2 ways to subscribe to root nodes: pass them during initialization or add them via the `add` method.
Both root nodes and other nodes can be transferred.
If another node is transferred, all root nodes are taken from it
and the old namespaces referenced by the original node and the new one are glued together.
If it is necessary that the events were without adding a namespace
you need to transfer the namespace as an empty string.

Examples:

```ts
type Events1 = { event1: number }
type Events2 = { event2: number }
type Events3 = { event3: number }
type Events4 = { event4: number }

const root1 = createTransport<Events1>({ name: 'root1' });
const root2 = createTransport<Events2>({ name: 'root2' });
const root3 = createTransport<Events3>({ name: 'root3' });
const root4 = createTransport<Events3>({ name: 'root4' });

type EventsNode1 =
  & Events1
  // utils type for add namespace in start event type
  & UtilsTypeAddNamespaceToEvents<'namespace1', Events2>
  & UtilsTypeAddNamespaceToEvents<'namespace1', Events3>;
const node1 = createSubscribeNode<Events1>({
  name: 'node1',
  roots: {
    // events without namespaces
    '': [root1],
    /**
     * events with namespace prefix
     * `namespace1:event2`
     * `namespace1:event3`
     * `namespace1:*`
    */
    'namespace1': [root2, root3]
  }
});

type EventsNode2 = EventsNode1;
const node2 = createSubscribeNode<EventsNode2>();
node2.add('', node1);

type EventsNode3 = UtilsTypeAddNamespaceToEvents<'namespace2', EventsNode2>;
const node3 = createSubscribeNode<EventsNode3>();
/**
 * events:
 * namespace2:namespace1:event2
 * namespace2:namespace1:event3
 * namespace2:namespace1:*
 * namespace2:event1
 * namespace2:*
*/
node3.add('namespace2', node2);

type EventsNode4 = EventsNode3;
// create with node
const node4 = createSubscribeNode<EventsNode2>({
  roots: { 'namespace2': [node3] }
});
type EventsNode5 =
  & EventsNode4
  & UtilsTypeAddNamespaceToEvents<'namespace2', Events4>;
// create with node and root
/**
 * events:
 * namespace2:namespace1:event2
 * namespace2:namespace1:event3
 * namespace2:namespace1:*
 * namespace2:event1
 * namespace2:event4
 * namespace2:*
*/
const node5 = createSubscribeNode<EventsNode2>({
  roots: { 'namespace2': [node4, root4] }
});
```

If you need to unsubscribe a node from the root node use the `remove` method.
If subscriptions were made to root nodes via the node, they will be automatically cancelled.
Example:

```ts
const root1 = createTransport({ name: 'root1' });
const root2 = createTransport({ name: 'root2' });
const root3 = createTransport({ name: 'root3' });

const node1 = createSubscribeNode({
  roots: {
    '': [root1],
    'namespace': [root2, root3]
  },
});
node1.getTransports();
// { '': [root1], 'namespace': [root2, root3] }
node1.remove('namespace', root2);
node1.getTransports();
// { '': [root1], 'namespace': [root3] }
node1.remove('namespace', root3);
node1.getTransports();
// { '': [root1] }
```

It is important that the add and remove methods for `add and remove` nodes modify the given instance, rather than creating a new one.

To access the root nodes referenced by a node there is a method `getTransports`.
This method is available for all nodes (including readonly), except for root nodes.

Example:

```ts
const root1 = createTransport();
const root2 = createTransport();
const root3 = createTransport();

root1.asReadonly().getTransports();

const node = createSubscribeNode()
  .add('namespace1', root1)
  .add('namespace2', root2)
  .add('namespace2', root3);

node.getTransports();
// { 'namespace1': [root1], 'namespace2': [root2, root3] }
node.asReadonly().getTransports();
// { 'namespace1': [root1], 'namespace2': [root2, root3] }
```

If, on the contrary, we want to extract the nodes we need from the common bus, we can use the `channel` method,
which will allow us to obtain the nodes of the namespace we need.
Namespaces will also be removed from event names both when receiving an event and in the Typescript type.

```ts
type Events1 = { event1: number }
type Events2 = { event2: number }
type Events3 = { event3: number }

const root1 = createTransport<Events1>();
const root2 = createTransport<Events2>();
const root3 = createTransport<Events3>();

const node1 = createSubscribeNode({
  roots: { namespace1: [root1] }
});
const node2 = createSubscribeNode({
  roots: { namespace1: [root2, root3], namespace2: [node1] }
});
const node3 = createSubscribeNode({
  roots: { namespace2: [root2, root3, node1] }
});

node2.getTransports();
// { 'namespace1': [root2, root3], 'namespace2:namespace1': [root1] }
node3.getTransports();
// { 'namespace2': [root2, root3], 'namespace2:namespace1': [root1] }

node2.channel('namespace1').getTransports();
// { '': [root2, root3] }
node2.channel('namespace2').getTransports();
// { 'namespace1': [root2, root3] }
node2.channel('namespace2:namespace1').getTransports();
// { '': [root2, root3] }

node3.channel('namespace2').getTransports();
// { '': [root2, root3], 'namespace1': [root1] }
```

Subscriptions and unsubscriptions use the same methods as the root node, but the type is a template string. The following subscription formats are available:

1) '*' - subscribe to all events of all root nodes. If an event contains namespaces in its name,
but they are not defined (there is no such namespace in the node list),
then it will be considered that this is the event name and will be sent to the root nodes.
2) event - subscribe to the event `event` of nodes that are in namespace === ''.
3) namespace:* - subscribe to all events of nodes under namespace.
If there are multiple namespaces that start with the one passed, then the subscription will be performed on all of them.
4) namespace:event - subscribe to the event `event` inside namespace

```ts
type Events1 = { event1: number; event1_1: number }
type Events2 = { event2: number }
type Events3 = { event3: number }

const root1 = createTransport<Events1>();
const root2 = createTransport<Events2>();
const root3 = createTransport<Events3>();

/**
 * event3: number;
 * 'namespace1:event1': number;
 * 'namespace1:event1_1': number;
 * 'namespace2:event2': number;
*/
type Node =
  & Events3
  & UtilsTypeAddNamespaceToEvents<'namespace1', Events1>
  & UtilsTypeAddNamespaceToEvents<'namespace2', Events2>
const node = createSubscribeNode<Node>()
  .add('namespace1', root1)
  .add('namespace2', root2)
  .add('', root3)

type Node1 = UtilsTypeAddNamespaceToEvents<'namespace1', Events1>;
// { 'namespace1:event1': number; 'namespace1:event1_1': number }
const node1 = createSubscribeNode().add('namespace1', root1)

type Node2 =
  & UtilsTypeAddNamespaceToEvents<'namespace2', Node>
  & UtilsTypeAddNamespaceToEvents<'namespace2', Events3>;
/**
 * 'namespace2:namespace1:event1': number;
 * 'namespace2:namespace1:event1_1': number;
 * 'namespace2:event3': number;
*/
const node2 = createSubscribeNode<Node2>()
  .add('namespace2', node1)
  .add('namespace2', root3);

node.on('*', () => {}) // all events
node.on('event3', () => {}); // event3
node.on('namespace1:*', () => {}); // namespace1:event1 namespace1:event1_1
node.on('namespace1:event1', () => {}); // namespace1:event1

node2.on('*', () => {}) // all events
node2.on('namespace2:*', () => {})
node2.on('namespace2:event3', () => {})
node2.on('namespace2:namespace1:*', () => {})
node2.on('namespace2:namespace1:event1', () => {})
```

If it is necessary for a node to be available in readonly mode, that is,
without mechanisms for destroying and adding/removing nodes for tracking,
and only subscription and unsubscription methods were available, then there is the `asReadonly()` method,
which creates a small wrapper and provides only methods for subscriptions (a child instance is created).

```ts
const root1 = createTransport();
const root2 = createTransport();

const node = createSubscribeNode()
node.add('namespace1', root1);

// on/once/off/getTransports methods and isDestroyed field
const readonlyNode = node.asReadonly();

node.add('namespace2', root2);
```