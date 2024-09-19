import { useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product, useProductList } from '../../../../../api-contract/src';
import { Event, Listener, useDebounce, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

const LIMIT = 8;

export const useProductListState = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');

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

  const debounce = useDebounce();

  const handleSearchInputChange = (text: string) => {
    setPage(1);
    debounce(() => setQuery(text), 600);
  };

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
    handleSearchInputChange,
    onDeleteMenuPress,
    onEditMenuPress,
    page,
    setPage,
    totalItem: data?.meta.total ?? 0,
    itemPerPage: LIMIT,
  };
};
