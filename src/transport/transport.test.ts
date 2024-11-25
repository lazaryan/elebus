import { createTransport } from './helper';

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
});

describe('on()', () => {
  it('calls subscriber', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('not double calls double subscriber', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.on('event', mockSubscriber);
    transport.on('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('calls subscribers', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    transport.on('event', mockSubscriber1);
    transport.on('event', mockSubscriber2);
    transport.on('event', mockSubscriber1);
    transport.on('event', mockSubscriber2);
    transport.send('event', 123);

    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);
  });

  it('subscribe only all events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('*', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('subscribe all events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    transport.on('*', mockSubscriber1);
    transport.on('event', mockSubscriber2);
    transport.send('event', 123);

    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);
  });

  it('unsubscribe subscriber', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    const unsubscriber = transport.on('event', mockSubscriber);
    transport.send('event', 123);
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    unsubscriber();
    transport.send('event', 123);
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });
});

describe('once()', () => {
  it('calls subscriber', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('not calls subscriber for after first call', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.send('event', 123);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('subscribe only * events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('subscribe * events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    transport.once('*', mockSubscriber1);
    transport.once('event', mockSubscriber2);
    transport.send('event', 123);

    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);
  });

  it('unsubscribe * subscriber after first event', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.send('event', 123);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('unsubscribe subscriber', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    const unsubscriber = transport.once('event', mockSubscriber);
    unsubscriber();
    transport.send('event', 123);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });
});

describe('destroy()', () => {
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
