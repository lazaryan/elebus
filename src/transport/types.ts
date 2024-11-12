export type TransportOptions = {
  /**
   * Transport name.
   */
  name?: string;

  /**
   * Callback is called when an transport is subscribed.
   *
   * @param event event name
   * @param isFirst Whether the subscriber is the first to this event.
   */
  onSubscribe?: (event: string, isFirst: boolean) => void;
  /**
   * Callback is called when an transport is unsubscribed.
   *
   * @param event event name
   * @param isHasSubscribers Are there any other subscribers to this event.
   * @returns
   */
  onUnsubscribe?: (event: string, isHasSubscribers: boolean) => void;
  /**
   * Callback is called when the signal is destroyed.
   */
  onDestroy?: () => void;
};
