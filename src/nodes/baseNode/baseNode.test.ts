import { Transport } from '../../transport';

import { BaseNode, type BaseNodeChildren } from './baseNode';

describe('BaseNode smoke', () => {
  it('create node without parents', (done) => {
    try {
      new BaseNode();
      done();
    } catch (error) {
      console.error(error);
      done.fail('fail create base node without parents');
    }
  });

  it('create node with parents', (done) => {
    const transport = new Transport();
    const roots: BaseNodeChildren<''> = new Map();
    roots.set('', new Set([transport]));

    try {
      new BaseNode({ children: roots });
      done();
    } catch (error) {
      console.error(error);
      done.fail('fail create base node with parents');
    }
  });

  it('destroy', () => {
    const node = new BaseNode();
    expect(node.destroy.bind(node)).not.toThrow();
  });

  it('watch transport', () => {
    const node = new BaseNode();
    const transport = new Transport();
    expect(node.watch.bind(node, transport)).not.toThrow();
  });

  it('watch transports (object)', () => {
    const node = new BaseNode();
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

    const roots: BaseNodeChildren<'' | 'namespace1' | 'namespace2'> = new Map();
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
    const node = new BaseNode();
    const transport1 = new Transport();
    const transport2 = new Transport();

    const roots: BaseNodeChildren<'' | 'namespace1' | 'namespace2'> = new Map();
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
  const transport = new Transport();

  afterAll(() => {
    transport.destroy();
  });

  it('subscribe to event', () => {
    const roots: BaseNodeChildren<''> = new Map();
    roots.set('', new Set([transport]));

    const node = new BaseNode({ children: roots });
    const mockSubscriber = jest.fn();
    node.on('event', mockSubscriber);
    transport.send('event', 123, { sync: true });

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    node.destroy();
    roots.clear();
  });
});
