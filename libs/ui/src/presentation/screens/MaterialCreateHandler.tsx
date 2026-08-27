import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, MaterialCreateUsecase, SupplierListUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialCreateController,
  useSupplierListController,
} from '../controllers';
import {
  MaterialCreateScreen,
  MaterialCreateScreenProps,
} from './MaterialCreateScreen';

export type MaterialCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  materialCreateUsecase: MaterialCreateUsecase;
  supplierListUsecase: SupplierListUsecase;
};

export const MaterialCreateHandler = ({
  authLogoutUsecase,
  materialCreateUsecase,
  supplierListUsecase,
}: MaterialCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const materialCreate = useMaterialCreateController(materialCreateUsecase);
  const supplierList = useSupplierListController(supplierListUsecase);
  const router = useRouter();

  useEffect(() => {
    if (materialCreate.state.type === 'submitSuccess') {
      router.push('/materials');
    }
  }, [materialCreate.state.type, router]);

  return (
    <MaterialCreateScreen
      defaultValues={materialCreate.state.values}
      onSubmit={(values) =>
        materialCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        materialCreate.state.type === 'submitting' ||
        materialCreate.state.type === 'submitError' ||
        materialCreate.state.type === 'submitSuccess'
      }
      isSubmitting={materialCreate.state.type === 'submitting'}
      serverError={
        materialCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      suppliers={supplierList.state.suppliers}
      isLoadingSuppliers={
        supplierList.state.type === 'idle' ||
        supplierList.state.type === 'loading'
      }
      variant={match(materialCreate.state)
        .returnType<MaterialCreateScreenProps['variant']>()
        .with(
          { type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError') },
          () => ({ type: 'loaded' })
        )
        .exhaustive()}
    />
  );
};
