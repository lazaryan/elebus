export interface BaseNodeImpl {
  on(type: string, callback: (type: string, payload?: any) => void): void;

  destroy: () => void;
}
