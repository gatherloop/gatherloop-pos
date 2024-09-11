import { useEffect, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useMaterialList } from '../../../../../api-contract/src';

export const useMaterialListState = () => {
  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useMaterialList({
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
    materials: data?.data ?? [],
    status,
    error,
    refetch,
    searchInputValue,
    setSearchInputValue,
  };
};
