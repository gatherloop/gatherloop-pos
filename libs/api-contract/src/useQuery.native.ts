import {
  DefaultError,
  QueryKey,
  useQuery as useTantackQuery,
} from '@tanstack/react-query';

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
  const query = useTantackQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...options,
  });

  return query;
}
