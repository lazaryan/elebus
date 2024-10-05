type Subscriber<NAMESPACES extends string> = {
  namespace: NAMESPACES;
  events: string[];
};

export function getSubscribers<NAMESPACES extends string | ''>(
  type: string,
  namespaces: NAMESPACES[],
): Subscriber<NAMESPACES>[] {
  // *
  if (type === '*') {
    return namespaces.map((namespace) => ({ namespace, events: ['*'] }));
  }

  // event
  if (!type.includes(':')) {
    return [{ namespace: '' as NAMESPACES, events: [type] }];
  }

  const separatorIndex = type.lastIndexOf(':');
  const eventNamespace = type.substring(0, separatorIndex);
  const event = type.substring(separatorIndex + 1);

  // namespace1:*
  // namespace1:namespace2:*
  if (event === '*') {
    return namespaces
      .filter((namespace) => namespace.startsWith(eventNamespace))
      .map((namespace) => ({ namespace, events: ['*'] }));
  }

  // namespace1:event
  // namespace1:namespace2:event
  if (namespaces.includes(eventNamespace as NAMESPACES)) {
    return [{ namespace: eventNamespace as NAMESPACES, events: [event] }];
  }

  // namespace === start type
  return [{ namespace: '' as NAMESPACES, events: [event] }];
}
