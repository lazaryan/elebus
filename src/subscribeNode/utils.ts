import type { TransportRootNodes } from '../types';

import type { OptionsRoots } from './types';

/**
 * Method for gluing two namespaces
 *
 * @example
 * mergeNamespaces('', '') // ''
 * mergeNamespaces('namespace1', '') // 'namespace1'
 * mergeNamespaces('', 'namespace2') // 'namespace2'
 * mergeNamespaces('namespace1', 'namespace2') // 'namespace1:namespace2'
 */
export function mergeNamespaces(
  namespace1: string,
  namespace2: string,
): string {
  if (!namespace1 && !namespace2) return '';
  if (!namespace1) return namespace2;
  if (!namespace2) return namespace1;

  return `${namespace1}:${namespace2}`;
}

export function parseOptionsRoots(
  optionRoots: OptionsRoots,
): TransportRootNodes {
  const resultRoots: TransportRootNodes = {};

  for (const namespace in optionRoots) {
    const namespaceRoots = optionRoots[namespace];
    resultRoots[namespace] = [];

    for (const node of namespaceRoots) {
      if (node.__isRoot) {
        if (node.isDestroyed || resultRoots[namespace].includes(node)) continue;
        resultRoots[namespace].push(node);
      } else {
        if (node.isDestroyed) continue;
        const allNodeRoots = node.getTransports();

        for (const rootNamespace in allNodeRoots) {
          const roots = allNodeRoots[rootNamespace];
          const mergedNamespace = mergeNamespaces(namespace, rootNamespace);
          if (!resultRoots[mergedNamespace]) {
            resultRoots[mergedNamespace] = [];
          }

          for (const root of roots) {
            if (root.isDestroyed || resultRoots[mergedNamespace].includes(root))
              continue;
            resultRoots[mergedNamespace].push(root);
          }
        }
      }
    }
  }

  return resultRoots;
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
    const result: Subscriber<NAMESPACES>[] = [];
    for (const namespace of namespaces) {
      result.push({ namespace, event: '*' });
    }
    return result;
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
    const result: Subscriber<NAMESPACES>[] = [];
    for (const namespace of namespaces) {
      if (
        namespace === eventNamespace ||
        namespace.startsWith(`${eventNamespace}:`)
      ) {
        result.push({ namespace, event: '*' });
      }
    }
    return result;
  }

  // namespace1:event
  // namespace1:namespace2:event
  if (namespaces.includes(eventNamespace as NAMESPACES)) {
    return [{ namespace: eventNamespace as NAMESPACES, event: event }];
  }

  // namespace === start type
  return [{ namespace: '' as NAMESPACES, event: type }];
}

export function findChannelNamespaces(
  channel: string,
  roots: TransportRootNodes,
): TransportRootNodes {
  const result: TransportRootNodes = {};
  const namespaces = Object.keys(roots);

  for (const namespace of namespaces) {
    if (namespace === channel) {
      result[''] = [...roots[namespace]];
      continue;
    }

    if (namespace.startsWith(channel + ':')) {
      const newNamespace = namespace.substring(channel.length + 1);
      if (result[newNamespace]) {
        result[newNamespace].push(...roots[namespace]);
      } else {
        result[newNamespace] = [...roots[namespace]];
      }
    }
  }

  return result;
}
