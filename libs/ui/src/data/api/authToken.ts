// On web the session lives in the httpOnly `Authorization` cookie the API
// sets on login (auth_handler.go) — there is no client-readable token to
// persist, so these are no-ops. See authToken.native.ts for the React
// Native counterpart, which Metro resolves in its place: RN's networking
// layer only stores/sends that cookie when Secure is satisfiable (HTTPS),
// which most native dev (and some prod) setups against the API aren't, so
// native carries the session as a bearer token instead.
export const getStoredAuthToken = (): Promise<string | null> =>
  Promise.resolve(null);

export const setStoredAuthToken = (_token: string): Promise<void> =>
  Promise.resolve();

export const clearStoredAuthToken = (): Promise<void> => Promise.resolve();

export const registerAuthTokenInterceptor = (): (() => void) => () => {
  // noop
};
