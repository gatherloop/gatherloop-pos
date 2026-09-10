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
