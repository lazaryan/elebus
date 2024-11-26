import { flushMicrotasks } from '../utils';

import { createBaseEventBus } from './helper';

describe('smoke tests', () => {
  it('init eventBus', () => {
    expect(createBaseEventBus.bind(null)).not.toThrow();
  });
  it('destroy eventBus', () => {
    const eventBus = createBaseEventBus();
    expect(eventBus.destroy.bind(eventBus)).not.toThrow();
  });
  it('on', () => {
    const eventBus = createBaseEventBus();

    expect(eventBus.on.bind(eventBus, 'event', () => {})).not.toThrow();
    expect(eventBus.destroy.bind(eventBus)).not.toThrow();
    expect(eventBus.isDestroyed).toBeTruthy();
  });
  it('once', () => {
    const eventBus = createBaseEventBus();

    expect(eventBus.once.bind(eventBus, 'event', () => {})).not.toThrow();
    expect(eventBus.destroy.bind(eventBus)).not.toThrow();
    expect(eventBus.isDestroyed).toBeTruthy();
  });
  it('unsubscribe', () => {
    const eventBus = createBaseEventBus();
    const action = () => {};
    eventBus.on('*', action);
    expect(eventBus.off.bind(eventBus, '*', action)).not.toThrow();
    expect(eventBus.destroy.bind(eventBus)).not.toThrow();
    expect(eventBus.isDestroyed).toBeTruthy();
  });
});

describe('on()', () => {
  it('not calls if not subscriber', async () => {
    const eventBus = createBaseEventBus<{ event1: number; event2: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event1', mockSubscriber);
    eventBus.send('event2', 123);

    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('calls subscriber', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event', mockSubscriber);
    eventBus.send('event', 123);

    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('calls subscriber if sending in one microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event', mockSubscriber);
    eventBus.send('event', 123);
    eventBus.send('event', 123);
    eventBus.send('event', 123);

    await flushMicrotasks(10);

    expect(mockSubscriber.mock.calls).toHaveLength(3);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber.mock.calls[1]).toEqual(['event', 123]);
    expect(mockSubscriber.mock.calls[2]).toEqual(['event', 123]);
  });

  it('not double calls double subscriber', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event', mockSubscriber);
    eventBus.on('event', mockSubscriber);
    eventBus.on('event', mockSubscriber);
    eventBus.send('event', 123);

    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('calls subscribers', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);
    eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);
    eventBus.send('event', 123);

    await flushMicrotasks();

    expect(mockSubscriber1.mock.calls).toHaveLength(1);
    expect(mockSubscriber1.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
    expect(mockSubscriber2.mock.calls[0]).toEqual(['event', 123]);
  });

  it('should unsubscribe after init', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const unsubscriber = eventBus.on('event', mockSubscriber1);
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
  });

  it('should unsubscribe after first event before send in next microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const unsubscriber = eventBus.on('event', mockSubscriber1);
    eventBus.send('event', 123);
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
  });

  it('should unsubscribe in next microtask after first event', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const unsubscriber = eventBus.on('event', mockSubscriber1);
    eventBus.send('event', 123);
    await flushMicrotasks();
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
  });

  it('double unsubscribe call', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    const unsubscriber = eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);

    unsubscriber();
    unsubscriber();
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
  });
});

describe('once()', () => {
  it('calls subscriber', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);

    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('not calls if not subscriber', async () => {
    const eventBus = createBaseEventBus<{ event1: number; event2: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event1', mockSubscriber);
    eventBus.send('event2', 123);

    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('not double calls double subscriber', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.once('event', mockSubscriber);
    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);

    await flushMicrotasks();
    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('not calls subscriber for after first call', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);
    eventBus.send('event', 123);

    await flushMicrotasks();
    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(1);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
  });

  it('calls after re-subscriber', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);
    eventBus.send('event', 123);

    await flushMicrotasks();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 234);

    await flushMicrotasks();
    await flushMicrotasks();

    expect(mockSubscriber.mock.calls).toHaveLength(2);
    expect(mockSubscriber.mock.calls[0]).toEqual(['event', 123]);
    expect(mockSubscriber.mock.calls[1]).toEqual(['event', 234]);
  });

  it('should unsubscribe after init', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const unsubscriber = eventBus.on('event', mockSubscriber1);
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
  });

  it('should unsubscribe after first event before send in next microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const unsubscriber = eventBus.once('event', mockSubscriber1);
    eventBus.send('event', 123);
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
  });

  it('should unsubscribe in next microtask after first event', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const unsubscriber = eventBus.once('event', mockSubscriber1);
    eventBus.send('event', 123);
    await flushMicrotasks();
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(1);
  });

  it('double unsubscribe call', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();

    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    const unsubscriber = eventBus.once('event', mockSubscriber1);
    eventBus.once('event', mockSubscriber2);

    unsubscriber();
    unsubscriber();
    unsubscriber();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
  });
});

describe('off() for on() subscribers', () => {
  it('should unsubscribe "on" event', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('should double unsubscribe "on" event', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('should unsubscribe "on" event in current microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.on('event', mockSubscriber);
    eventBus.send('event', 123);
    eventBus.off('event', mockSubscriber);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('not error if call unsubscribe and off for "on"', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    const unsubscribe = eventBus.on('event', mockSubscriber);
    unsubscribe();
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('not error if call off and unsubscribe for "on"', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    const unsubscribe = eventBus.on('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);
    unsubscribe();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('should not unsubscribe from unnecessary function for "on"', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);

    eventBus.off('event', mockSubscriber1);
    eventBus.off('event', mockSubscriber1);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
  });
});

describe('off() for once() subscribers', () => {
  it('should unsubscribe "once" event', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('should double unsubscribe "once" event', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('should unsubscribe "once" event in current microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);
    eventBus.off('event', mockSubscriber);

    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('not error if call unsubscribe and off for "once"', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    const unsubscribe = eventBus.once('event', mockSubscriber);
    unsubscribe();
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('not error if call unsubscribe after first call in this microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
  });

  it('not error if call unsubscribe after first call in next microtask', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    eventBus.once('event', mockSubscriber);
    eventBus.send('event', 123);
    await flushMicrotasks();
    eventBus.off('event', mockSubscriber);

    eventBus.send('event', 123);
    await flushMicrotasks();
  });

  it('not error if call off and unsubscribe for "once"', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber = jest.fn();

    const unsubscribe = eventBus.once('event', mockSubscriber);
    eventBus.off('event', mockSubscriber);
    unsubscribe();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber.mock.calls).toHaveLength(0);
  });

  it('should not unsubscribe from unnecessary function for "once"', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    eventBus.once('event', mockSubscriber1);
    eventBus.once('event', mockSubscriber2);

    eventBus.off('event', mockSubscriber1);
    eventBus.off('event', mockSubscriber1);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
    expect(mockSubscriber2.mock.calls).toHaveLength(1);
  });
});

describe('destroy()', () => {
  it('set isDisabled field after destroy', () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    expect(eventBus.isDestroyed).toBeFalsy();
    eventBus.destroy();
    expect(eventBus.isDestroyed).toBeTruthy();
  });

  it('not send events for subscribers before destroy', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);
    eventBus.destroy();

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
    expect(mockSubscriber2.mock.calls).toHaveLength(0);
  });

  it('not send events for subscribers after destroy', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();

    eventBus.destroy();
    eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);

    eventBus.send('event', 123);
    await flushMicrotasks();
    expect(mockSubscriber1.mock.calls).toHaveLength(0);
    expect(mockSubscriber2.mock.calls).toHaveLength(0);
  });

  it('clear all data after destroy', async () => {
    const eventBus = createBaseEventBus<{ event: number }>();
    const mockSubscriber1 = jest.fn();
    const mockSubscriber2 = jest.fn();
    const mockSubscriber3 = jest.fn();

    eventBus.on('event', mockSubscriber1);
    eventBus.on('event', mockSubscriber2);
    eventBus.once('event', mockSubscriber3);

    eventBus.destroy();
    await flushMicrotasks(10);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(Object.keys(eventBus.__subscribers).length).toEqual(0);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(Object.keys(eventBus.__onceCallbackMap).length).toEqual(0);
  });
});
