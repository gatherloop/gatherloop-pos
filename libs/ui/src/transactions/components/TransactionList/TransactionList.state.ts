import { useEffect, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionList } from '../../../../../api-contract/src';

export const useTransactionListState = () => {
  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useTransactionList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const [searchInputValue, setSearchInputValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(searchInputValue);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInputValue]);

  return {
    transactions: data?.data ?? [],
    status,
    error,
    refetch,
    searchInputValue,
    setSearchInputValue,
  };
};
