import { createTransport } from '../transport';
import { UtilsTypeAddNamespaceToEvents } from '../typeUtils';

import { createSubscribeNode } from './helper';

type TestEvents = {
  event1: number;
  event2: number;
};

describe('constructor()', () => {
  it('add root when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<TestEvents>({
      roots: { '': [transport] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node.on('event1', mockSubscriber1);
    node.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('not add double root when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<TestEvents>({
      roots: { '': [transport, transport] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node.on('event1', mockSubscriber1);
    node.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('add root node to namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<
      UtilsTypeAddNamespaceToEvents<'namespace', TestEvents>
    >({ roots: { namespace: [transport] } });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    node.on('namespace:event1', mockSubscriber1);
    node.on('namespace:*', mockSubscriber2);
    node.on('*', mockSubscriber3);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber3.mock.calls).toHaveLength(1);
    expect(mockSubscriber3.mock.calls[0]).toEqual(['namespace:event1', 123]);
  });

  it('not add double root node to namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<
      UtilsTypeAddNamespaceToEvents<'namespace', TestEvents>
    >({ roots: { namespace: [transport, transport] } });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    node.on('namespace:event1', mockSubscriber1);
    node.on('namespace:*', mockSubscriber2);
    node.on('*', mockSubscriber3);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber3.mock.calls).toHaveLength(1);
    expect(mockSubscriber3.mock.calls[0]).toEqual(['namespace:event1', 123]);
  });

  it('not double soubscibe to any event root node to namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<
      UtilsTypeAddNamespaceToEvents<'namespace', TestEvents>
    >({ roots: { namespace: [transport] } });
    const mockSubscriber1 = jest.fn();

    node.on('namespace:event1', mockSubscriber1);
    node.on('namespace:event1', mockSubscriber1);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['namespace:event1', 123]);
  });

  it('add many root node to namespace', () => {
    const transport1 = createTransport<TestEvents>({ sync: true });
    const transport2 = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<
      UtilsTypeAddNamespaceToEvents<'namespace', TestEvents>
    >({ roots: { namespace: [transport1, transport2] } });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    node.on('namespace:event1', mockSubscriber1);
    node.on('namespace:*', mockSubscriber2);
    node.on('*', mockSubscriber3);

    transport1.send('event1', 123);
    transport2.send('event1', 234);
    transport2.send('event2', 234);

    expect(mockSubscriber1.mock.calls).toHaveLength(2);
    expect(mockSubscriber1.mock.calls).toEqual([
      ['namespace:event1', 123],
      ['namespace:event1', 234],
    ]);

    expect(mockSubscriber2.mock.calls).toHaveLength(3);
    expect(mockSubscriber2.mock.calls).toEqual([
      ['namespace:event1', 123],
      ['namespace:event1', 234],
      ['namespace:event2', 234],
    ]);

    expect(mockSubscriber3.mock.calls).toHaveLength(3);
    expect(mockSubscriber3.mock.calls).toEqual([
      ['namespace:event1', 123],
      ['namespace:event1', 234],
      ['namespace:event2', 234],
    ]);
  });

  it('add node when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node1 = createSubscribeNode<TestEvents>({
      roots: { '': [transport] },
    });
    const node2 = createSubscribeNode<TestEvents>({ roots: { '': [node1] } });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node2.on('event1', mockSubscriber1);
    node2.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('add root and node when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node1 = createSubscribeNode<TestEvents>({
      roots: { '': [transport] },
    });
    const node2 = createSubscribeNode<TestEvents>({
      roots: { '': [transport, node1] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node2.on('event1', mockSubscriber1);
    node2.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('add node and root when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node1 = createSubscribeNode<TestEvents>({
      roots: { '': [transport] },
    });
    const node2 = createSubscribeNode<TestEvents>({
      roots: { '': [node1, transport] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node2.on('event1', mockSubscriber1);
    node2.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('add node with namespace when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    type Node1 = UtilsTypeAddNamespaceToEvents<'namespace1', TestEvents>;
    type Node2 = UtilsTypeAddNamespaceToEvents<'namespace2', Node1>;

    const node1 = createSubscribeNode<Node1>({
      roots: { namespace1: [transport] },
    });
    const node2 = createSubscribeNode<Node2>({
      roots: { namespace2: [node1] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    node2.on('namespace2:namespace1:*', mockSubscriber1);
    node2.on('namespace2:namespace1:event1', mockSubscriber2);
    node2.on('*', mockSubscriber3);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual([
      'namespace2:namespace1:event1',
      123,
    ]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual([
      'namespace2:namespace1:event1',
      123,
    ]);

    expect(mockSubscriber3.mock.calls).toHaveLength(1);
    expect(mockSubscriber3.mock.calls[0]).toEqual([
      'namespace2:namespace1:event1',
      123,
    ]);
  });

  it('add node and root with namespace when create node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    type Node1 = UtilsTypeAddNamespaceToEvents<'namespace1', TestEvents>;
    type Node2 = UtilsTypeAddNamespaceToEvents<'namespace2', TestEvents> &
      UtilsTypeAddNamespaceToEvents<'namespace2', Node1>;

    const node1 = createSubscribeNode<Node1>({
      roots: { namespace1: [transport] },
    });
    const node2 = createSubscribeNode<Node2>({
      roots: { namespace2: [node1, transport] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();
    const mockSubscriber4 = jest.fn();

    node2.on('namespace2:namespace1:*', mockSubscriber1);
    node2.on('namespace2:namespace1:event1', mockSubscriber2);
    node2.on('*', mockSubscriber3);
    node2.on('namespace2:event1', mockSubscriber4);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual([
      'namespace2:namespace1:event1',
      123,
    ]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual([
      'namespace2:namespace1:event1',
      123,
    ]);

    expect(mockSubscriber3.mock.calls).toHaveLength(2);
    expect(mockSubscriber3.mock.calls).toEqual([
      ['namespace2:event1', 123],
      ['namespace2:namespace1:event1', 123],
    ]);

    expect(mockSubscriber4.mock.calls).toHaveLength(1);
    expect(mockSubscriber4.mock.calls[0]).toEqual(['namespace2:event1', 123]);
  });
});

describe('add()', () => {
  it('not double add if root add in creating node', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<TestEvents>({
      roots: { '': [transport] },
    });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node.add('', transport);
    node.on('event1', mockSubscriber1);
    node.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('add root node to root namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<TestEvents>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node.add('', transport);
    node.on('event1', mockSubscriber1);
    node.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('not double add root node to root namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<TestEvents>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    node.add('', transport);
    node.add('', transport);

    node.on('event1', mockSubscriber1);
    node.on('*', mockSubscriber2);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);
  });

  it('add root node to namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node =
      createSubscribeNode<
        UtilsTypeAddNamespaceToEvents<'namespace', TestEvents>
      >();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    node.add('namespace', transport);
    node.on('namespace:event1', mockSubscriber1);
    node.on('namespace:*', mockSubscriber2);
    node.on('*', mockSubscriber3);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber3.mock.calls).toHaveLength(1);
    expect(mockSubscriber3.mock.calls[0]).toEqual(['namespace:event1', 123]);
  });

  it('not double add root node to namespace', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node =
      createSubscribeNode<
        UtilsTypeAddNamespaceToEvents<'namespace', TestEvents>
      >();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    node.add('namespace', transport);
    node.add('namespace', transport);

    node.on('namespace:event1', mockSubscriber1);
    node.on('namespace:*', mockSubscriber2);
    node.on('*', mockSubscriber3);

    transport.send('event1', 123);
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['namespace:event1', 123]);

    expect(mockSubscriber3.mock.calls).toHaveLength(1);
    expect(mockSubscriber3.mock.calls[0]).toEqual(['namespace:event1', 123]);
  });

  it('add root namespace in many namespaces', () => {
    const transport = createTransport<TestEvents>({ sync: true });
    const node = createSubscribeNode<
      UtilsTypeAddNamespaceToEvents<'', TestEvents> &
        UtilsTypeAddNamespaceToEvents<'namespace1', TestEvents> &
        UtilsTypeAddNamespaceToEvents<'namespace2', TestEvents>
    >();

    node.add('', transport);
    node.add('namespace1', transport);
    node.add('namespace2', transport);

    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();
    const mockSubscriber4 = jest.fn();

    node.on('*', mockSubscriber1);
    node.on('event1', mockSubscriber2);
    node.on('namespace1:event1', mockSubscriber3);
    node.on('namespace2:*', mockSubscriber4);
    transport.send('event1', 123);

    expect(mockSubscriber1.mock.calls).toHaveLength(3);
    expect(mockSubscriber1.mock.calls).toEqual([
      ['event1', 123],
      ['namespace1:event1', 123],
      ['namespace2:event1', 123],
    ]);

    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event1', 123]);

    expect(mockSubscriber3.mock.calls).toHaveLength(1);
    expect(mockSubscriber3.mock.calls[0]).toEqual(['namespace1:event1', 123]);

    expect(mockSubscriber4.mock.calls).toHaveLength(1);
    expect(mockSubscriber4.mock.calls[0]).toEqual(['namespace2:event1', 123]);
  });
});
