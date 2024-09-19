import { useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product, useProductList } from '../../../../../api-contract/src';
import { Event, Listener, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

const LIMIT = 8;

export const useProductListState = () => {
  const router = useRouter();

  const [searchValue, setSearhValue] = useState('');

  const [query, setQuery] = useState('');

  useEffect(() => {
    setPage(1);
    const timeout = setTimeout(() => setQuery(searchValue), 600);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const [page, setPage] = useState(1);

  const { data, status, error, refetch } = useProductList({
    sortBy: 'created_at',
    order: 'desc',
    query,
    limit: LIMIT,
    skip: (page - 1) * LIMIT,
  });

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'ProductDeleteSuccess',
        callback: () => refetch(),
      },
    ],
    [refetch]
  );

  const { emit } = useEventEmitter(listeners);

  const onDeleteMenuPress = (product: Product) => {
    emit({
      type: 'ProductDeleteConfirmation',
      productId: product.id,
    });
  };

  const onEditMenuPress = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  return {
    products: data?.data ?? [],
    status,
    error,
    refetch,
    searchValue,
    setSearhValue,
    onDeleteMenuPress,
    onEditMenuPress,
    page,
    setPage,
    totalItem: data?.meta.total ?? 0,
    itemPerPage: LIMIT,
  };
};
