import {
  DefaultError,
  QueryKey,
  useQuery as useTantackQuery,
} from '@tanstack/react-query';

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: Parameters<
    typeof useTantackQuery<TQueryFnData, TError, TData, TQueryKey>
  >[0]
) {
  return useTantackQuery(options);
}
