import { useCallback, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useMaterialDeleteById,
  useMaterialFindById,
} from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';
import { PostMessageEvent, usePostMessage } from '../../../base';

export const useMaterialDeleteAlertState = () => {
  const [materialId, setMaterialId] = useState<number>();
  const { status, mutateAsync } = useMaterialDeleteById(materialId ?? NaN);
  const { data } = useMaterialFindById(materialId ?? NaN, {
    query: { enabled: typeof materialId === 'number' },
  });

  const onReceiveMessage = useCallback((event: PostMessageEvent) => {
    if (event.type === 'MaterialDeleteConfirmation') {
      setMaterialId(event.materialId);
    }
  }, []);

  const { postMessage } = usePostMessage(onReceiveMessage);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Material deleted successfully');
        postMessage({ type: 'MaterialDeleteSuccess' });
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
