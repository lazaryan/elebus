import { getSubscriberId, getSubscribers } from './utils';

describe('getSubscriberId()', () => {
  it('should return valid id', () => {
    expect(getSubscriberId('', '')).toBe(':');
    expect(getSubscriberId('namespace', 'event')).toBe('namespace:event');
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
