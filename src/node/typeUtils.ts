export type MergeNamespaceAndTypeName<
  NAMESPACE extends string,
  TYPE extends string,
> = NAMESPACE extends '' ? TYPE : `${NAMESPACE}:${TYPE}`;

export type ExtractSubNamespace<
  STR extends string,
  NAMESPACE extends string,
> = STR extends `${NAMESPACE}:${infer TYPE}` ? TYPE : STR;

export type FilterTypeWithNamespace<
  STR extends string,
  NAMESPACE extends string,
> = STR extends `${NAMESPACE}:${infer TYPE}` ? TYPE : never;
