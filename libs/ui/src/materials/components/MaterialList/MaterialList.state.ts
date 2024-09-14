import { useEffect, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useMaterialList } from '../../../../../api-contract/src';
import { useDebounce } from '../../../base';

export const useMaterialListState = () => {
  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useMaterialList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const debounce = useDebounce();

  const handleSearchInputChange = (text: string) => {
    debounce(() => setQuery(text), 600);
  };

  return {
    materials: data?.data ?? [],
    status,
    error,
    refetch,
    handleSearchInputChange
  };
};
