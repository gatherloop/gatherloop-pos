import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, MaterialCreateUsecase, SupplierListUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialCreateController,
  useSupplierListController,
} from '../controllers';
import {
  MaterialCreateScreen,
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
      form={materialCreate.form}
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
      availableSuppliers={supplierList.state.suppliers}
      isLoadingSuppliers={
        supplierList.state.type === 'idle' ||
        supplierList.state.type === 'loading'
      }
    />
  );
};
