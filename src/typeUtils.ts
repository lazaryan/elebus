import { EventLike } from './types';

/**
 * Utility type for gluing namespace and type name
 *
 * @example
 * UtilsTypeAddNamespaceToType<'namespace', 'type'> // 'namespace:type'
 */
export type UtilsTypeAddNamespaceToType<
  NAMESPACE extends string,
  TYPE extends string,
> = `${NAMESPACE}:${TYPE}`;

/**
 * Utility type of extraction from event name type without namespace
 *
 * @example
 * UtilsTypeRemoveNamespaceFromType<'namespace:event', 'namespace'> // 'event'
 */
export type UtilsTypeRemoveNamespaceFromType<
  NAMESPACED_TYPE extends string,
  NAMESPACE extends string,
> = NAMESPACED_TYPE extends `${NAMESPACE}:${infer TYPE}` ? TYPE : never;

/**
 * Utility type for adding to namespace event names
 *
 * @example
 *
 * type Event = { event1: boolean; event2: number; }
 * UtilsTypeAddNamespaceToEvents<'namespace', Event> // { 'namespace:event1': boolean; 'namespace:event2': number; }
 */
export type UtilsTypeAddNamespaceToEvents<
  NAMESPACE extends string,
  EVENT extends EventLike,
> = NAMESPACE extends ''
  ? EVENT
  : {
      [TYPE in UtilsTypeAddNamespaceToType<
        NAMESPACE,
        string & keyof EVENT
      >]: EVENT[UtilsTypeRemoveNamespaceFromType<TYPE, NAMESPACE>];
    };

/**
 * Utility type for getting namespace from event name (max size 5 namespaces)
 *
 * @example
 *
 * UtilsTypeFilterTypesWithNamespaces<'namespace1:event', 'event'> // 'namespace1'
 * UtilsTypeFilterTypesWithNamespaces<'namespace1:namespace2:event', 'event'> // 'namespace1:namespace2'
 * UtilsTypeFilterTypesWithNamespaces<'namespace1:namespace2:namespace3:event', 'event'> // 'namespace1:namespace2:namespace3'
 */
export type UtilsTypeFilterTypesWithNamespaces<
  STR extends string,
  TYPE extends string,
> = STR extends `${infer NAMESPACE_1}:${infer NAMESPACE_2}:${infer NAMESPACE_3}:${infer NAMESPACE_4}:${infer NAMESPACE_5}:${TYPE}`
  ? `${NAMESPACE_1}:${NAMESPACE_2}:${NAMESPACE_3}:${NAMESPACE_4}:${NAMESPACE_5}`
  : STR extends `${infer NAMESPACE_1}:${infer NAMESPACE_2}:${infer NAMESPACE_3}:${infer NAMESPACE_4}:${TYPE}`
    ? `${NAMESPACE_1}:${NAMESPACE_2}:${NAMESPACE_3}:${NAMESPACE_4}`
    : STR extends `${infer NAMESPACE_1}:${infer NAMESPACE_2}:${infer NAMESPACE_3}:${TYPE}`
      ? `${NAMESPACE_1}:${NAMESPACE_2}:${NAMESPACE_3}`
      : STR extends `${infer NAMESPACE_1}:${infer NAMESPACE_2}:${TYPE}`
        ? `${NAMESPACE_1}:${NAMESPACE_2}`
        : STR extends `${infer NAMESPACE}:${TYPE}`
          ? `${NAMESPACE}`
          : never;
