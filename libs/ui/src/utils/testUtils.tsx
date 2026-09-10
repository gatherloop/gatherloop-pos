export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));
