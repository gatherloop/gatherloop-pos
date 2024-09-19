// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useCategoryDeleteById,
  useCategoryFindById,
} from '../../../../../api-contract/src';
import { useMemo, useState } from 'react';
import { useToastController } from '@tamagui/toast';
import { Listener, Event, useEventEmitter } from '../../../base';

export const useCategoryDeleteAlertState = () => {
  const [categoryId, setCategoryId] = useState<number>();

  const { status, mutateAsync } = useCategoryDeleteById(categoryId ?? NaN);
  const { data } = useCategoryFindById(categoryId ?? NaN, {
    query: { enabled: typeof categoryId === 'number' },
  });

  const toast = useToastController();

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'CategoryDeleteConfirmation',
        callback: (event) => setCategoryId(event.categoryId),
      },
    ],
    []
  );

  const { emit } = useEventEmitter(listeners);

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Category deleted successfully');
        emit({ type: 'CategoryDeleteSuccess' });
        setCategoryId(undefined);
      })
      .catch(() => toast.show('Failed to delete category'));
  };

  const isOpen = typeof categoryId === 'number';

  const onCancel = () => setCategoryId(undefined);

  return {
    status,
    onButtonConfirmPress,
    categoryName: data?.data.name,
    isOpen,
    onCancel,
  };
};
