import { useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material, useMaterialList } from '../../../../../api-contract/src';
import { Event, Listener, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

const LIMIT = 10;

export const useMaterialListState = () => {
  const router = useRouter();

  const [searchValue, setSearhValue] = useState('');

  const [query, setQuery] = useState('');

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    const timeout = setTimeout(() => setQuery(searchValue), 600);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const { data, status, error, refetch } = useMaterialList({
    sortBy: 'created_at',
    order: 'desc',
    query,
    limit: LIMIT,
    skip: (page - 1) * LIMIT,
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

  return {
    materials: data?.data ?? [],
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
