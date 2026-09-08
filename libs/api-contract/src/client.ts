import {
  RequestConfig as SwaggerRequestConfig,
  ResponseConfig as SwaggerResponseConfig,
} from '@kubb/swagger-client/client';
import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';

// The browser always resolves `/api` through the same-origin proxy
// (`rewrites()`), so this branch is unchanged for every consumer.
const browserBaseUrl =
  process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL'];

// Node cannot resolve a relative URL. `getServerSideProps` needs the API
// origin directly, so it hairpins nowhere. Neither var set (every consumer
// but `apps/order-web`, which is the only one that sets
// `API_INTERNAL_BASE_URL`) falls back to `browserBaseUrl`, which keeps
// `apps/pos-web` and `apps/pos-mobile` byte-identical to before this change
// — `apps/pos-mobile` has no `window`, so it always takes this branch.
const serverBaseUrl =
  process.env['API_INTERNAL_BASE_URL'] ??
  process.env['NEXT_PUBLIC_API_BASE_URL'] ??
  browserBaseUrl;

export const axiosInstance = axios.create({
  baseURL: typeof window === 'undefined' ? serverBaseUrl : browserBaseUrl,
});

export type ResponseConfig<T> = SwaggerResponseConfig<T>;

// Kubb's generated `RequestConfig` — "a subset of AxiosRequestConfig" —
// omits `withCredentials`, even though axios itself accepts it. Widened
// here so a caller can set it per request (D3 in
// docs/trd-order-app-composition-and-ssr.md: the order app's three
// repositories set this to `false`, since it sends no auth cookie and used
// to flip a global axios default instead). Every generated client
// function's `options` parameter is `Partial<Parameters<typeof client>[0]>`
// — derived from this function's own parameter type — so widening it here
// is enough; nothing generated needs to change.
export type RequestConfig<T = unknown> = SwaggerRequestConfig<T> & {
  withCredentials?: boolean;
};

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
      // A per-request `withCredentials` (D3) wins; otherwise fall back to
      // the instance default — `true`, the POS's cookie-based auth,
      // unchanged for every caller that never sets one.
      withCredentials:
        config.withCredentials ??
        axiosInstance.defaults.withCredentials ??
        true,
    })
    .catch((e: AxiosError<TError>) => {
      throw e;
    });

  return promise;
};

export default axiosClient;
