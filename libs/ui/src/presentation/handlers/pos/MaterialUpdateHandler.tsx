import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, MaterialUpdateUsecase, SupplierListUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout, useSupplierList } from '../hooks';
import {
  MaterialUpdateScreen,
  MaterialUpdateScreenProps,
} from '../../screens/pos/MaterialUpdateScreen';

export type MaterialUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  materialUpdateUsecase: MaterialUpdateUsecase;
  supplierListUsecase: SupplierListUsecase;
};

export const MaterialUpdateHandler = ({
  authLogoutUsecase,
  materialUpdateUsecase,
  supplierListUsecase,
}: MaterialUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const materialUpdate = useUsecase(materialUpdateUsecase);
  const supplierList = useSupplierList(supplierListUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (materialUpdate.state.type === 'submitSuccess') {
      toast.show('Update Material Success');
      router.push('/materials');
    } else if (materialUpdate.state.type === 'submitError') {
      toast.show('Update Material Error');
    }
  }, [materialUpdate.state.type, router, toast]);

  return (
    <MaterialUpdateScreen
      defaultValues={materialUpdate.state.values}
      onSubmit={(values) =>
        materialUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        materialUpdate.state.type === 'submitting' ||
        materialUpdate.state.type === 'submitError' ||
        materialUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={materialUpdate.state.type === 'submitting'}
      serverError={
        materialUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      suppliers={supplierList.state.suppliers}
      isLoadingSuppliers={
        supplierList.state.type === 'idle' ||
        supplierList.state.type === 'loading'
      }
      variant={match(materialUpdate.state)
        .returnType<MaterialUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => materialUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
