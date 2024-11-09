import { createTransport } from './helpers';

describe('smoke tests', () => {
  it('init transport', () => {
    expect(createTransport.bind(null)).not.toThrow();
  });
  it('destroy transport', () => {
    const transport = createTransport();
    expect(transport.destroy.bind(transport)).not.toThrow();
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

describe('destroy', () => {
  it('not destroyed in start', () => {
    const transport = createTransport();
    expect(transport.isDestroyed).toBeFalsy();
  });
  it('isDestroyed is true after destroy', () => {
    const transport = createTransport();
    transport.destroy();
    expect(transport.isDestroyed).toBeTruthy();
  });
  it('not send messages after destroy for old subbscribers', () => {
    const transport = createTransport<{ event: undefined }>();
    const mockSubscriber = jest.fn();
    transport.on('event', mockSubscriber);
    transport.destroy();
    transport.send('event');
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });
  it('not send messages after destroy for new subbscribers', () => {
    const transport = createTransport<{ event: undefined }>();
    const mockSubscriber = jest.fn();
    transport.destroy();
    transport.on('event', mockSubscriber);
    transport.send('event');
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });
});
