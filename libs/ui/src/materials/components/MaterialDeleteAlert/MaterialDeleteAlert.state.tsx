import { useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useMaterialDeleteById,
  useMaterialFindById,
} from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';
import { Event, Listener, useEventEmitter } from '../../../base';

export const useMaterialDeleteAlertState = () => {
  const [materialId, setMaterialId] = useState<number>();
  const { status, mutateAsync } = useMaterialDeleteById(materialId ?? NaN);
  const { data } = useMaterialFindById(materialId ?? NaN, {
    query: { enabled: typeof materialId === 'number' },
  });

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'MaterialDeleteConfirmation',
        callback: (event) => setMaterialId(event.materialId),
      },
    ],
    []
  );

  const { emit } = useEventEmitter(listeners);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Material deleted successfully');
        emit({ type: 'MaterialDeleteSuccess' });
        setMaterialId(undefined);
      })
      .catch(() => toast.show('Failed to delete material'));
  };

  const isOpen = typeof materialId === 'number';

  const onCancel = () => setMaterialId(undefined);

  return {
    status,
    onButtonConfirmPress,
    materialName: data?.data.name ?? '',
    isOpen,
    onCancel,
  };
};
