import { Transport } from '../transport/transport';

import { TransportNode, type TransportNodeChildren } from './node';

describe('BaseNode smoke', () => {
  it('create node without parents', (done) => {
    try {
      new TransportNode();
      done();
    } catch (error) {
      console.error(error);
      done.fail('fail create base node without parents');
    }
  });

  it('create node with parents', (done) => {
    const transport = new Transport();
    const roots: TransportNodeChildren<''> = new Map();
    roots.set('', new Set([transport]));

    try {
      new TransportNode({ children: roots });
      done();
    } catch (error) {
      console.error(error);
      done.fail('fail create base node with parents');
    }
  });

  it('destroy', () => {
    const node = new TransportNode();
    expect(node.destroy.bind(node)).not.toThrow();
  });

  it('watch transport', () => {
    const node = new TransportNode();
    const transport = new Transport();
    expect(node.watch.bind(node, transport)).not.toThrow();
  });

  it('watch transports (object)', () => {
    const node = new TransportNode();
    const transport1 = new Transport();
    const transport2 = new Transport();

    expect(
      node.watchTransports.bind(node, { '': new Set([transport1]) }),
    ).not.toThrow();
    expect(
      node.watchTransports.bind(node, {
        '': new Set([transport1, transport1]),
      }),
    ).not.toThrow();
    expect(
      node.watchTransports.bind(node, {
        '': new Set([transport1, transport2]),
      }),
    ).not.toThrow();
    expect(
      node.watchTransports.bind(node, {
        namespace1: new Set([transport1]),
        namespace2: new Set([transport1, transport2]),
      }),
    ).not.toThrow();

    const roots: TransportNodeChildren<'' | 'namespace1' | 'namespace2'> =
      new Map();
    roots.set('', new Set([transport1]));
    expect(node.watchTransports.bind(node, roots)).not.toThrow();

    roots.set('', new Set([transport1, transport2]));
    expect(node.watchTransports.bind(node, roots)).not.toThrow();

    roots.clear();
    roots.set('namespace1', new Set([transport1]));
    roots.set('namespace2', new Set([transport1, transport2]));
    expect(node.watchTransports.bind(node, roots)).not.toThrow();
  });

  it('watch transports (map)', () => {
    const node = new TransportNode();
    const transport1 = new Transport();
    const transport2 = new Transport();

    const roots: TransportNodeChildren<'' | 'namespace1' | 'namespace2'> =
      new Map();
    roots.set('', new Set([transport1]));
    expect(node.watchTransports.bind(node, roots)).not.toThrow();

    roots.set('', new Set([transport1, transport2]));
    expect(node.watchTransports.bind(node, roots)).not.toThrow();

    roots.clear();
    roots.set('namespace1', new Set([transport1]));
    roots.set('namespace2', new Set([transport1, transport2]));
    expect(node.watchTransports.bind(node, roots)).not.toThrow();
  });
});

describe('BaseNode.on()', () => {
  it('subscribe to transport', () => {
    const transport = new Transport<{ event: number; event2: undefined }>();

    const roots: TransportNodeChildren<''> = new Map();
    roots.set('', new Set([transport]));

    const node = new TransportNode<{ event: number; event2: undefined }>({
      children: roots,
    });
    const mockSubscriber = jest.fn();
    node.on('event', mockSubscriber);
    transport.send('event', 123, { sync: true });
    transport.send('event2', undefined, { sync: true });

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
    node.destroy();
    roots.clear();
  });

  it('subscribe to transport for watch', () => {
    const transport = new Transport<{ event: number; event2: undefined }>();

    const node = new TransportNode().watch(transport, '');
    const mockSubscriber = jest.fn();
    node.on('event', mockSubscriber);
    transport.send('event', 123, { sync: true });
    transport.send('event2', undefined, { sync: true });

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
    node.destroy();
  });

  it('subscribe to transport for watchTransports', () => {
    const transport = new Transport<{ event: number; event2: undefined }>();

    const node = new TransportNode().watchTransports<
      { event: number; event2: undefined },
      ''
    >({ '': new Set([transport]) });
    const mockSubscriber = jest.fn();
    node.on('event', mockSubscriber);
    transport.send('event', 123, { sync: true });
    transport.send('event2', undefined, { sync: true });

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
    node.destroy();
  });
});
