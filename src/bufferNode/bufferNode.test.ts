import { createTransport } from '../transport';

import { createBufferNode } from './helper';

describe('smoke tests', () => {
  it('init buffer node', () => {
    const transport = createTransport();
    expect(createBufferNode.bind(null, transport, 0)).not.toThrow();
  });
  it('destroy node', () => {
    const transport = createTransport();
    const node = createBufferNode(transport, 0);

    expect(node.destroy.bind(node)).not.toThrow();
  });
  it('subscribe', () => {
    const transport = createTransport();
    const node = createBufferNode(transport, 0);

    expect(node.on.bind(node, '*', () => {})).not.toThrow();
    expect(node.destroy.bind(node)).not.toThrow();
    expect(node.isDestroyed).toBeTruthy();
  });
  it('unsubscribe', () => {
    const transport = createTransport();
    const node = createBufferNode(transport, 0);

    const action = () => {};
    node.on('*', action);
    expect(node.off.bind(node, '*', action)).not.toThrow();
    expect(node.destroy.bind(node)).not.toThrow();
    expect(node.isDestroyed).toBeTruthy();
  });
});
