import { flushMicrotasks } from '../utils';

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

describe('lifecycyle ', () => {
  describe('destroy', () => {
    it('destroy event for on', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      transport.lifecycle.on('destroy', mockSubscriber);
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);
      expect(mockSubscriber.mock.calls[0]).toEqual(['destroy', undefined]);
    });

    it('destroy event for once', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      transport.lifecycle.once('destroy', mockSubscriber);
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);
      expect(mockSubscriber.mock.calls[0]).toEqual(['destroy', undefined]);
    });

    it('not double send event for on', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      transport.lifecycle.on('destroy', mockSubscriber);
      transport.destroy();
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);
      expect(mockSubscriber.mock.calls[0]).toEqual(['destroy', undefined]);
    });

    it('not double send event for once', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      transport.lifecycle.once('destroy', mockSubscriber);
      transport.destroy();
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);
      expect(mockSubscriber.mock.calls[0]).toEqual(['destroy', undefined]);
    });

    it('unsubscribe on event', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      const unsubscribe = transport.lifecycle.on('destroy', mockSubscriber);
      unsubscribe();
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);
    });

    it('unsubscribe on event for off', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      transport.lifecycle.on('destroy', mockSubscriber);
      transport.lifecycle.off('destroy', mockSubscriber);
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);
    });

    it('unsubscribe once event', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      const unsubscribe = transport.lifecycle.once('destroy', mockSubscriber);
      unsubscribe();
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);
    });

    it('unsubscribe on event for off', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();

      transport.lifecycle.once('destroy', mockSubscriber);
      transport.lifecycle.off('destroy', mockSubscriber);
      transport.destroy();

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('send event for subscribers', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();
      const mockSubscriberEvent1 = jest.fn();
      const mockSubscriberEvent2 = jest.fn();

      transport.lifecycle.on('subscribe', mockSubscriber);
      const unsubscriber1 = transport.on('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);
      expect(mockSubscriber.mock.calls[0]).toEqual([
        'subscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent1,
          subscribersCount: 1,
        },
      ]);

      transport.on('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);

      const unsubscriber2 = transport.on('event', mockSubscriberEvent2);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(2);
      expect(mockSubscriber.mock.calls[1]).toEqual([
        'subscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent2,
          subscribersCount: 2,
        },
      ]);

      unsubscriber1();
      unsubscriber2();

      transport.on('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(3);
      expect(mockSubscriber.mock.calls[2]).toEqual([
        'subscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent1,
          subscribersCount: 1,
        },
      ]);

      transport.destroy();
    });

    it('not send event after destroy (subscribe before)', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();
      const mockSubscriberEvent1 = jest.fn();

      transport.lifecycle.on('subscribe', mockSubscriber);
      transport.destroy();
      transport.on('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);

      transport.destroy();
    });

    it('not send event after destroy (subscribe after)', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();
      const mockSubscriberEvent1 = jest.fn();

      transport.destroy();
      transport.lifecycle.on('subscribe', mockSubscriber);
      transport.on('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);

      transport.destroy();
    });
  });

  describe('unsubscribe', () => {
    it('send event for unsubscribers', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();
      const mockSubscriberEvent1 = jest.fn();
      const mockSubscriberEvent2 = jest.fn();
      const mockSubscriberEvent3 = jest.fn();

      transport.lifecycle.on('unsubscribe', mockSubscriber);
      transport.on('event', mockSubscriberEvent1);
      transport.off('event', mockSubscriberEvent1);

      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(1);
      expect(mockSubscriber.mock.calls[0]).toEqual([
        'unsubscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent1,
          subscribersCount: 0,
        },
      ]);

      transport.on('*', mockSubscriberEvent2);
      transport.off('*', mockSubscriberEvent2);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(2);
      expect(mockSubscriber.mock.calls[1]).toEqual([
        'unsubscribe',
        {
          event: '*',
          mode: 'on',
          subscriber: mockSubscriberEvent2,
          subscribersCount: 0,
        },
      ]);

      transport.on('event', mockSubscriberEvent1);
      transport.on('event', mockSubscriberEvent2);
      transport.on('event', mockSubscriberEvent3);

      transport.off('event', mockSubscriberEvent3);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(3);
      expect(mockSubscriber.mock.calls[2]).toEqual([
        'unsubscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent3,
          subscribersCount: 2,
        },
      ]);

      transport.off('event', mockSubscriberEvent2);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(4);
      expect(mockSubscriber.mock.calls[3]).toEqual([
        'unsubscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent2,
          subscribersCount: 1,
        },
      ]);

      transport.off('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(5);
      expect(mockSubscriber.mock.calls[4]).toEqual([
        'unsubscribe',
        {
          event: 'event',
          mode: 'on',
          subscriber: mockSubscriberEvent1,
          subscribersCount: 0,
        },
      ]);

      transport.destroy();
    });

    it('send all events after destroy (subscribe before)', async () => {
      const transport = createTransport<{ event: number; event2: number }>();
      const mockSubscriber = jest.fn();
      const mockSubscriberEvent1 = jest.fn();
      const mockSubscriberEvent2 = jest.fn();
      transport.on('event', mockSubscriberEvent1);
      transport.on('event2', mockSubscriberEvent2);

      transport.lifecycle.on('unubscribe', mockSubscriber);
      transport.destroy();
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);
    });

    it('not send event after destroy (subscribe after)', async () => {
      const transport = createTransport<{ event: number }>();
      const mockSubscriber = jest.fn();
      const mockSubscriberEvent1 = jest.fn();
      transport.on('event', mockSubscriberEvent1);

      transport.destroy();
      transport.lifecycle.on('unubscribe', mockSubscriber);
      transport.off('event', mockSubscriberEvent1);
      await flushMicrotasks();
      expect(mockSubscriber.mock.calls).toHaveLength(0);
    });
  });
});

describe('on()', () => {
  it('calls subscriber (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('calls subscriber (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('not double calls double subscriber (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.on('event', mockSubscriber);
    transport.on('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('not double calls double subscriber (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.on('event', mockSubscriber);
    transport.on('event', mockSubscriber);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('calls subscribers (sync)', () => {
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

    transport.destroy();
  });

  it('calls subscribers (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    transport.on('event', mockSubscriber1);
    transport.on('event', mockSubscriber2);
    transport.on('event', mockSubscriber1);
    transport.on('event', mockSubscriber2);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('subscribe only all events (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('*', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('subscribe only all events (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.on('*', mockSubscriber);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('subscribe all events (sync)', () => {
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

    transport.destroy();
  });

  it('subscribe all events (sync)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    transport.on('*', mockSubscriber1);
    transport.on('event', mockSubscriber2);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
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
  it('calls subscriber (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('calls subscriber (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('not double calls double subscriber (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.once('event', mockSubscriber);
    transport.once('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);

    transport.destroy();
  });

  it('not double calls double subscriber (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.once('event', mockSubscriber);
    transport.once('event', mockSubscriber);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('not calls subscriber for after first call (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.send('event', 123);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('not calls subscriber for after first call (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.send('event', 123);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('subscribe only * events (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('subscribe only * events (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('subscribe * events (sync)', () => {
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
    transport.destroy();
  });

  it('subscribe * events (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    transport.once('*', mockSubscriber1);
    transport.once('event', mockSubscriber2);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('unsubscribe * subscriber after first event (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.send('event', 123);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('unsubscribe * subscriber after first event (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.send('event', 123);
    transport.send('event', 123);

    await flushMicrotasks();
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    transport.destroy();
  });

  it('unsubscribe subscriber (sync)', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    const unsubscriber = transport.once('event', mockSubscriber);
    unsubscriber();
    transport.send('event', 123);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(0);
    transport.destroy();
  });
  it('unsubscribe subscriber (async)', async () => {
    const transport = createTransport<{ event: number }>();
    const mockSubscriber = jest.fn();

    const unsubscriber = transport.once('event', mockSubscriber);
    unsubscriber();
    transport.send('event', 123);
    transport.send('event', 123);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
    transport.destroy();
  });
});

describe('off', () => {
  it('unsubscribe on events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('event', mockSubscriber);
    transport.off('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(0);
    transport.destroy();
  });
  it('unsubscribe on * events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.on('*', mockSubscriber);
    transport.off('*', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(0);
    transport.destroy();
  });
  it('unsubscribe once events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('event', mockSubscriber);
    transport.off('event', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(0);
    transport.destroy();
  });
  it('unsubscribe once * events', () => {
    const transport = createTransport<{ event: number }>({ sync: true });
    const mockSubscriber = jest.fn();

    transport.once('*', mockSubscriber);
    transport.off('*', mockSubscriber);
    transport.send('event', 123);

    expect(mockSubscriber.mock.calls).toHaveLength(0);
    transport.destroy();
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
