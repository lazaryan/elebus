import type { TransportRoot } from '../transport';

import {
  findChannelNamespaces,
  getSubscribers,
  mergeNamespaces,
} from './utils';

describe('mergeNamespaces()', () => {
  it('should return valid data', () => {
    expect(mergeNamespaces('', '')).toEqual('');
    expect(mergeNamespaces('namespace1', '')).toEqual('namespace1');
    expect(mergeNamespaces('', 'namespace2')).toEqual('namespace2');
    expect(mergeNamespaces('namespace1', 'namespace2')).toEqual(
      'namespace1:namespace2',
    );
  });
});

describe('getSubscribers()', () => {
  it('should return all namespaces for event = "*"', () => {
    expect(getSubscribers('*', [])).toEqual([]);
    expect(getSubscribers('*', ['namespace1', 'namespace2'])).toEqual([
      { namespace: 'namespace1', event: '*' },
      { namespace: 'namespace2', event: '*' },
    ]);
  });
  it('should return base namespace if event is not includes namespaces in name', () => {
    expect(getSubscribers('event', [])).toEqual([
      { namespace: '', event: 'event' },
    ]);
    expect(getSubscribers('event_event', [])).toEqual([
      { namespace: '', event: 'event_event' },
    ]);
  });
  it('should return all namespaces for event = "namespaces:*"', () => {
    expect(getSubscribers('namespace:*', [])).toEqual([]);
    expect(getSubscribers('namespace:*', ['namespace123'])).toEqual([]);
    expect(getSubscribers('namespace123:*', ['namespace'])).toEqual([]);
    expect(getSubscribers('namespace:*', ['namespace'])).toEqual([
      { namespace: 'namespace', event: '*' },
    ]);
    expect(
      getSubscribers('namespace:*', ['namespace', 'namespace:namespace2']),
    ).toEqual([
      { namespace: 'namespace', event: '*' },
      { namespace: 'namespace:namespace2', event: '*' },
    ]);
    expect(getSubscribers('namespace:*', ['namespace:namespace2'])).toEqual([
      { namespace: 'namespace:namespace2', event: '*' },
    ]);
    expect(
      getSubscribers('namespace:namespace2:*', ['namespace:namespace2']),
    ).toEqual([{ namespace: 'namespace:namespace2', event: '*' }]);
  });
  it('should return all namespaces for event = "namespaces:event"', () => {
    expect(getSubscribers('namespace:event', ['namespace'])).toEqual([
      { namespace: 'namespace', event: 'event' },
    ]);
    expect(
      getSubscribers('namespace:namespace1:event', ['namespace:namespace1']),
    ).toEqual([{ namespace: 'namespace:namespace1', event: 'event' }]);
  });
  it('should return event if has ":" but not startWith namespaces', () => {
    expect(getSubscribers('namespace:event', [])).toEqual([
      { namespace: '', event: 'namespace:event' },
    ]);
    expect(getSubscribers('namespace:event', ['namespace123'])).toEqual([
      { namespace: '', event: 'namespace:event' },
    ]);
    expect(getSubscribers('namespace123:event', ['namespace'])).toEqual([
      { namespace: '', event: 'namespace123:event' },
    ]);
  });
});

describe('findChannelNamespaces()', () => {
  it('should return empty object if not found', () => {
    const root1 = { name: 'root1' } as TransportRoot<any>;
    const root2 = { name: 'root2' } as TransportRoot<any>;

    expect(
      findChannelNamespaces('channel', { namespace: [root1, root2] }),
    ).toEqual({});
    expect(
      findChannelNamespaces('channel', { channel123: [root1, root2] }),
    ).toEqual({});
    expect(
      findChannelNamespaces('channel', {
        namespace1: [root1],
        namespace2: [root2],
      }),
    ).toEqual({});
  });

  it('should return list for equal namespace', () => {
    const root1 = { name: 'root1' } as TransportRoot<any>;
    const root2 = { name: 'root2' } as TransportRoot<any>;

    expect(findChannelNamespaces('namespace', { namespace: [] })).toEqual({
      '': [],
    });
    expect(
      findChannelNamespaces('namespace', { namespace: [root1, root2] }),
    ).toEqual({ '': [root1, root2] });
    expect(
      findChannelNamespaces('namespace1', {
        namespace1: [root1],
        namespace2: [root2],
      }),
    ).toEqual({ '': [root1] });
  });

  it('should return list for namespaces startWith channel:', () => {
    const root1 = { name: 'root1' } as TransportRoot<any>;
    const root2 = { name: 'root2' } as TransportRoot<any>;

    expect(
      findChannelNamespaces('namespace', { 'namespace1:namespace2': [] }),
    ).toEqual({});
    expect(
      findChannelNamespaces('namespace', { 'namespace1:namespace': [] }),
    ).toEqual({});
    expect(
      findChannelNamespaces('namespace1', {
        'namespace1:namespace2': [root1],
        namespace2: [root2],
      }),
    ).toEqual({ namespace2: [root1] });
    expect(
      findChannelNamespaces('namespace1', {
        'namespace1:namespace2:namespace3': [root1],
        namespace2: [root2],
      }),
    ).toEqual({ 'namespace2:namespace3': [root1] });
  });
});
