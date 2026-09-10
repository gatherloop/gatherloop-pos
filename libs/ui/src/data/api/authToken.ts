export const getStoredAuthToken = (): Promise<string | null> =>
  Promise.resolve(null);

export const setStoredAuthToken = (_token: string): Promise<void> =>
  Promise.resolve();

export const clearStoredAuthToken = (): Promise<void> => Promise.resolve();

export const registerAuthTokenInterceptor = (): (() => void) => () => {
  // noop
};
