export type TransportOptions = {
  name?: string;

  onSubscribe?: (event: string, isFirst: boolean) => void;
  onUnsubscribe?: (event: string, isHasSubscribers: boolean) => void;
  onDestroy?: () => void;
};
