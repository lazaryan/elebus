import { EventLike } from './types';
import { Transport } from './transport';

type IsSubscriberFormatString<
  STR extends string,
  START extends string,
  MIDDLE extends string,
> = STR extends `${START}:*` | `${START}:{${MIDDLE}}` ? STR : never;

type TransportNodeChildren<NAMESPACES extends string> = Map<
  NAMESPACES,
  Set<Transport<any>>
>;

type TransportNodeProps<NAMESPACES extends string> = {
  children?: TransportNodeChildren<NAMESPACES>;
};

export class TransportNode<
  EVENTS extends EventLike = {},
  NAMESPACES extends string = '',
> {
  private __children: TransportNodeChildren<NAMESPACES>;

  constructor(props?: TransportNodeProps<NAMESPACES>) {
    this.__children = props?.children ?? new Map();
  }

  public subscribe<
    EVENT_TYPE extends keyof EVENTS | '*' | string,
    A extends string,
    B extends string,
    IS_FORMATTER extends IsSubscriberFormatString<
      EVENT_TYPE extends string ? EVENT_TYPE : never,
      A,
      B
    >,
    EVENT extends EVENT_TYPE extends '*'
      ? keyof EVENTS
      : IS_FORMATTER extends never
        ? EVENT_TYPE
        : keyof EVENTS,
    CB extends {
      [TYPE in EVENT]: [TYPE, EVENTS[TYPE]];
    },
  >(_type: EVENT_TYPE, _callback: (...args: CB[EVENT]) => void): void {
    // const namespaces = [...this.__children.keys()];
  }

  public getWatchTransports(): Readonly<TransportNodeChildren<NAMESPACES>> {
    return this.__children;
  }
}

export function createTransportNode<T extends EventLike>(): TransportNode<T> {
  return new TransportNode<T, ''>();
}
