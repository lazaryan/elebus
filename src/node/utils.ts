export function getSubscriberId(namespace: string, event: string): string {
  return `${namespace}:${event}`;
}

export type Subscriber<NAMESPACES extends string> = {
  namespace: NAMESPACES;
  event: string;
};

/**
 * Function for parsing a formatted event.
 * The function accepts the type and namespaces that are in the node.
 *
 * Formats:
 * '*' -> all events
 * 'event' -> event
 * 'namespace:*' -> all events for current namespace
 * 'namespace:event' -> event in namespace
 *
 * @param type subscribe format type string
 * @param namespaces used namespaces in node
 *
 * @example
 * ```ts
 * getSubscribers('*', ['n1', 'n2']) // [{ namespace: 'n1', event: '*' }, { namespace: 'n2', event: '*' }]
 * getSubscribers('event', ['n1', 'n2']) // [{ namespace: '', event: '*' }] // root namespace
 * getSubscribers('n1:*', ['n1', 'n1:n2', 'n2']) // [{ namespace: 'n1', event: '*' }, { namespace: 'n1:n2', event: '*' }]
 * getSubscribers('n1:n2:*', ['n1', 'n1:n2', 'n2']) // [{ namespace: 'n1:n2', event: '*' }]
 * getSubscribers('n1:n2:event', ['n1', 'n1:n2', 'n2']) // [{ namespace: 'n1:n2', event: 'event' }]
 * getSubscribers('event_namespace:event', ['n1', 'n1:n2', 'n2']) // [{ namespace: '', event: 'event_namespace:event' }] // event include namespace format
 * ```
 */
export function getSubscribers<NAMESPACES extends string | ''>(
  type: string,
  namespaces: NAMESPACES[],
): Subscriber<NAMESPACES>[] {
  // *
  if (type === '*') {
    return namespaces.map((namespace) => ({ namespace, event: '*' }));
  }

  // event
  if (!type.includes(':')) {
    return [{ namespace: '' as NAMESPACES, event: type }];
  }

  const separatorIndex = type.lastIndexOf(':');
  const eventNamespace = type.substring(0, separatorIndex);
  const event = type.substring(separatorIndex + 1);

  // namespace1:*
  // namespace1:namespace2:*
  if (event === '*') {
    return namespaces
      .filter(
        (namespace) =>
          namespace === eventNamespace ||
          namespace.startsWith(`${eventNamespace}:`),
      )
      .map((namespace) => ({ namespace, event: '*' }));
  }

  // namespace1:event
  // namespace1:namespace2:event
  if (namespaces.includes(eventNamespace as NAMESPACES)) {
    return [{ namespace: eventNamespace as NAMESPACES, event: event }];
  }

  // namespace === start type
  return [{ namespace: '' as NAMESPACES, event: type }];
}
