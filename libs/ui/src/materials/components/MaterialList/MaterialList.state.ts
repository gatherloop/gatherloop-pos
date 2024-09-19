import { useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material, useMaterialList } from '../../../../../api-contract/src';
import { Event, Listener, useDebounce, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

export const useMaterialListState = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useMaterialList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'MaterialDeleteSuccess',
        callback: () => refetch(),
      },
    ],
    [refetch]
  );

  const { emit } = useEventEmitter(listeners);

  const onDeleteMenuPress = (material: Material) => {
    emit({
      type: 'MaterialDeleteConfirmation',
      materialId: material.id,
    });
  };

  const onEditMenuPress = (material: Material) => {
    router.push(`/materials/${material.id}`);
  };

  const debounce = useDebounce();

  const handleSearchInputChange = (text: string) => {
    debounce(() => setQuery(text), 600);
  };

  return {
    materials: data?.data ?? [],
    status,
    error,
    refetch,
    handleSearchInputChange,
    onDeleteMenuPress,
    onEditMenuPress,
  };
};
