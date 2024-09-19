// eslint-disable-next-line @nx/enforce-module-boundaries
import { Category, useCategoryList } from '../../../../../api-contract/src';
import { useMemo } from 'react';
import { Listener, Event, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

export const useCategoryListState = () => {
  const router = useRouter();

  const { data, status, error, refetch } = useCategoryList();

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'CategoryDeleteSuccess',
        callback: () => refetch(),
      },
    ],
    [refetch]
  );

  const { emit } = useEventEmitter(listeners);

  const onDeleteMenuPress = (category: Category) => {
    emit({
      type: 'CategoryDeleteConfirmation',
      categoryId: category.id,
    });
  };

  const onEditMenuPress = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  return {
    categories: data?.data ?? [],
    status,
    error,
    refetch,
    onDeleteMenuPress,
    onEditMenuPress,
  };
};
