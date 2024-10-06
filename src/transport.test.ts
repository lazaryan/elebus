import { createTransport } from './transport';

describe('smoke tests', () => {
  it('init transport', () => {
    expect(createTransport.bind(null)).not.toThrow();
  });
  it('destroy transport', () => {
    const transport = createTransport();
    expect(transport.isDestroyed).toBeFalsy();
    expect(transport.destroy.bind(transport)).not.toThrow();
    expect(transport.isDestroyed).toBeTruthy();
  });
  it('subscribe', () => {
    const transport = createTransport();
    expect(transport.on.bind(transport, '*', () => {})).not.toThrow();
    expect(transport.destroy.bind(transport)).not.toThrow();
    expect(transport.isDestroyed).toBeTruthy();
  });
  it('unsubscribe', () => {
    const transport = createTransport();
    const action = () => {};
    transport.on('*', action);
    expect(transport.off.bind(transport, '*', action)).not.toThrow();
    expect(transport.destroy.bind(transport)).not.toThrow();
    expect(transport.isDestroyed).toBeTruthy();
  });
  it('send', async () => {
    const transport = createTransport<{ '': undefined }>();
    expect(await transport.send.bind(transport, '')).not.toThrow();
    transport.on('*', () => {});
    expect(await transport.send.bind(transport, '')).not.toThrow();
  });
  it('asReadonly', () => {
    const transport = createTransport();
    expect(transport.asReadonly.bind(transport)).not.toThrow();
  });
});
