import {
  DefaultError,
  QueryKey,
  useQuery as useTantackQuery,
} from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

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

  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, [query.refetch])
  );

  return query;
}
