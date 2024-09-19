import { useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product, useProductList } from '../../../../../api-contract/src';
import { Event, Listener, useDebounce, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

export const useProductListState = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useProductList({
    sortBy: 'created_at',
    order: 'desc',
    query,
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
  };
};
