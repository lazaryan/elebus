type Subscriber<NAMESPACES extends string> = {
  namespace: NAMESPACES;
  event: string;
};

export function getSubscriberId(namespace: string, event: string): string {
  return `${namespace}:${event}`;
}

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
