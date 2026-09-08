import {
  RequestConfig,
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
      // Defaults to `true` (the POS's cookie-based auth, unchanged) unless
      // something has explicitly set the instance default otherwise — which
      // is exactly what the order app's `registerSessionHeaderInterceptor`
      // does (D22 in docs/prd-table-ordering.md: no cookie for that app, so
      // credentials only widen the CORS surface for no reason). A literal
      // `withCredentials: true` here would silently override that.
      withCredentials: axiosInstance.defaults.withCredentials ?? true,
    })
    .catch((e: AxiosError<TError>) => {
      throw e;
    });

  return promise;
};

export default axiosClient;
