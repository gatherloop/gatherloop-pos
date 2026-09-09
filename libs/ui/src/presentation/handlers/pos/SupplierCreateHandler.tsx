import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, SupplierCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  SupplierCreateScreen,
  SupplierCreateScreenProps,
} from '../../screens/pos/SupplierCreateScreen';

export type SupplierCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  supplierCreateUsecase: SupplierCreateUsecase;
};

export const SupplierCreateHandler = ({
  authLogoutUsecase,
  supplierCreateUsecase,
}: SupplierCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const supplierCreate = useUsecase(supplierCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (supplierCreate.state.type === 'submitSuccess') {
      toast.show('Create Supplier Success');
      router.push('/suppliers');
    } else if (supplierCreate.state.type === 'submitError') {
      toast.show('Create Supplier Error');
    }
  }, [supplierCreate.state.type, toast, router]);

  return (
    <SupplierCreateScreen
      defaultValues={supplierCreate.state.values}
      onSubmit={(values) => supplierCreate.dispatch({ type: 'SUBMIT', values })}
      isSubmitDisabled={
        supplierCreate.state.type === 'submitting' ||
        supplierCreate.state.type === 'submitError' ||
        supplierCreate.state.type === 'submitSuccess'
      }
      isSubmitting={supplierCreate.state.type === 'submitting'}
      serverError={
        supplierCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={match(supplierCreate.state)
        .returnType<SupplierCreateScreenProps['variant']>()
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with(
          {
            type: P.union('submitting', 'submitSuccess', 'submitError'),
          },
          () => ({
            type: 'loaded',
          })
        )
        .exhaustive()}
    />
  );
};
