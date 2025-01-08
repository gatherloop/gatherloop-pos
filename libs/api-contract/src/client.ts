import {
  RequestConfig,
  ResponseConfig as SwaggerResponseConfig,
} from '@kubb/swagger-client/client';
import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';

export const axiosInstance = axios.create({
  baseURL:
    process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL'],
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
