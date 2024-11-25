import { EventLike } from './types';

export type UtilsTypeAddNamespaceToType<
  NAMESPACE extends string,
  TYPE extends string,
> = `${NAMESPACE}:${TYPE}`;

export type UtilsTypeRemoveNamespaceFromType<
  NAMESPACED_TYPE extends string,
  NAMESPACE extends string,
> = NAMESPACED_TYPE extends `${NAMESPACE}:${infer TYPE}` ? TYPE : never;

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
