// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useProductDeleteById,
  useProductFindById,
} from '../../../../../api-contract/src';
import { useCallback, useMemo, useState } from 'react';
import { useToastController } from '@tamagui/toast';
import { Event, Listener, useEventEmitter } from '../../../base';

export const useProductDeleteAlertState = () => {
  const [productId, setProductId] = useState<number>();
  const { status, mutateAsync } = useProductDeleteById(productId ?? NaN);
  const { data } = useProductFindById(productId ?? NaN, {
    query: { enabled: typeof productId === 'number' },
  });

  const onReceiveMessage = useCallback((event: Event) => {
    if (event.type === 'ProductDeleteConfirmation') {
      setProductId(event.productId);
    }
  }, []);

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'ProductDeleteConfirmation',
        callback: (event) => setProductId(event.productId),
      },
    ],
    []
  );

  const { emit } = useEventEmitter(listeners);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Product deleted successfully');
        emit({ type: 'ProductDeleteSuccess' });
        setProductId(undefined);
      })
      .catch(() => toast.show('Failed to delete product'));
  };

  const isOpen = typeof productId === 'number';

  const onCancel = () => setProductId(undefined);

  return {
    status,
    onButtonConfirmPress,
    productName: data?.data.name ?? '',
    isOpen,
    onCancel,
  };
};
