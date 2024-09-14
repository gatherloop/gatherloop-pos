import { useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionList } from '../../../../../api-contract/src';
import { useDebounce } from '../../../base';

export const useTransactionListState = () => {
  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useTransactionList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const debounce = useDebounce();

  const handleSearchInputChange = (text: string) => {
    debounce(() => setQuery(text), 600);
  };

  return {
    transactions: data?.data ?? [],
    status,
    error,
    refetch,
    handleSearchInputChange,
  };
};
