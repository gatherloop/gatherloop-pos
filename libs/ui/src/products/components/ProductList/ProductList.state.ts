import { useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useProductList } from '../../../../../api-contract/src';
import { useDebounce } from '../../../base';

export const useProductListState = () => {
  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useProductList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const debounce = useDebounce();

  const handleSearchInputChange = (text: string) => {
    debounce(() => setQuery(text), 600);
  };

  return {
    products: data?.data ?? [],
    status,
    error,
    refetch,
    handleSearchInputChange,
  };
};
