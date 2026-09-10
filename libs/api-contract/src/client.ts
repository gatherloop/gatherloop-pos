import {
  RequestConfig as SwaggerRequestConfig,
  ResponseConfig as SwaggerResponseConfig,
} from '@kubb/swagger-client/client';
import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';

const browserBaseUrl =
  process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL'];

const serverBaseUrl =
  process.env['API_INTERNAL_BASE_URL'] ??
  process.env['NEXT_PUBLIC_API_BASE_URL'] ??
  browserBaseUrl;

export const axiosInstance = axios.create({
  baseURL: typeof window === 'undefined' ? serverBaseUrl : browserBaseUrl,
});

export type ResponseConfig<T> = SwaggerResponseConfig<T>;

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
