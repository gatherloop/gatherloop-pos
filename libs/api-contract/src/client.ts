import {
  RequestConfig,
  ResponseConfig as SwaggerResponseConfig,
} from '@kubb/swagger-client/client';
import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';

// Populated only by apps/order's Vite `define` config (added alongside the
// Vite app itself). `import.meta.env` can't be referenced directly here:
// it's only legal syntax inside a genuine ES module, and this file is also
// require()'d as CommonJS by Next/React Native's Jest runners and bundled
// by Metro for the mobile app — both hard-crash on that syntax. A
// build-time global guarded by `typeof` (the same pattern React Native's
// own `__DEV__` uses) resolves to 'undefined' everywhere except a Vite
// build, so Next and React Native are unaffected.
declare const __VITE_API_BASE_URL__: string | undefined;
const viteApiBaseUrl =
  typeof __VITE_API_BASE_URL__ !== 'undefined'
    ? __VITE_API_BASE_URL__
    : undefined;

export const axiosInstance = axios.create({
  baseURL:
    process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ??
    viteApiBaseUrl ??
    Config['API_BASE_URL'],
});

export type ResponseConfig<T> = SwaggerResponseConfig<T>;

export const axiosClient = async <
  TData,
  TError = unknown,
  TVariables = unknown
>(
  config: RequestConfig<TVariables>
): Promise<ResponseConfig<TData>> => {
  const promise = axiosInstance
    .request<TData, ResponseConfig<TData>>({
      ...config,
      withCredentials: true,
    })
    .catch((e: AxiosError<TError>) => {
      throw e;
    });

  return promise;
};

export default axiosClient;
