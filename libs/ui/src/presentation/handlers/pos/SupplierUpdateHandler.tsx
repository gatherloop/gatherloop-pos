import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, SupplierUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import {
  SupplierUpdateScreen,
  SupplierUpdateScreenProps,
} from '../../screens/pos/SupplierUpdateScreen';

export type SupplierUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  supplierUpdateUsecase: SupplierUpdateUsecase;
};

export const SupplierUpdateHandler = ({
  authLogoutUsecase,
  supplierUpdateUsecase,
}: SupplierUpdateHandlerProps) => {
  const supplierUpdate = useController(supplierUpdateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (supplierUpdate.state.type === 'submitSuccess') {
      toast.show('Update Supplier Success');
      router.push('/suppliers');
    } else if (supplierUpdate.state.type === 'submitError') {
      toast.show('Update Supplier Error');
    }
  }, [supplierUpdate.state.type, toast, router]);

  return (
    <SupplierUpdateScreen
      defaultValues={supplierUpdate.state.values}
      onSubmit={(values) => supplierUpdate.dispatch({ type: 'SUBMIT', values })}
      isSubmitDisabled={
        supplierUpdate.state.type === 'submitting' ||
        supplierUpdate.state.type === 'submitError' ||
        supplierUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={supplierUpdate.state.type === 'submitting'}
      serverError={
        supplierUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={match(supplierUpdate.state)
        .returnType<SupplierUpdateScreenProps['variant']>()
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
          onRetryButtonPress: () => supplierUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
