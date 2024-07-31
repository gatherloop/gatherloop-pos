import { useEffect, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useProductList,
  useRefetchOnFocus,
} from '../../../../../api-contract/src';

export const useProductListState = () => {
  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useProductList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });
  useRefetchOnFocus(refetch);

  const [searchInputValue, setSearchInputValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(searchInputValue);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInputValue]);

  return {
    products: data?.data ?? [],
    status,
    error,
    refetch,
    setSearchInputValue,
    searchInputValue,
  };
};
