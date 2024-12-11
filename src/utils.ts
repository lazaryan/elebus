export async function flushMicrotasks(timeout = 0): Promise<void> {
  return await new Promise((resolve) =>
    setTimeout(() => resolve(undefined), timeout),
  );
}

export const noopFunction = () => {};
