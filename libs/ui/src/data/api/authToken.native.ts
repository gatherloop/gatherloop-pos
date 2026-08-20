import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { axiosInstance } from '../../../../api-contract/src/client';

const AUTH_TOKEN_STORAGE_KEY = 'gl_auth_token';

export const getStoredAuthToken = (): Promise<string | null> =>
  AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

export const setStoredAuthToken = (token: string): Promise<void> =>
  AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);

export const clearStoredAuthToken = (): Promise<void> =>
  AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

// The API's session cookie is Secure-only (auth_handler.go) and native dev
// (and some prod) setups talk to it over plain HTTP, so the cookie never
// round-trips — CheckAuth on the API falls back to a plain `Authorization`
// header for exactly this reason (base_middlewares.go), and the login
// response already carries the raw JWT (AuthLoginResponse.data) for a
// client to keep. This attaches it to every request from storage instead of
// relying on the cookie jar.
export const registerAuthTokenInterceptor = (): (() => void) => {
  axiosInstance.defaults.withCredentials = false;

  const interceptorId = axiosInstance.interceptors.request.use(
    async (config) => {
      const token = await getStoredAuthToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    }
  );

  return () => axiosInstance.interceptors.request.eject(interceptorId);
};
