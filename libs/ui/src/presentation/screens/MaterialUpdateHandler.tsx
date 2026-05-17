import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, MaterialUpdateUsecase, SupplierListUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialUpdateController,
  useSupplierListController,
} from '../controllers';
import {
  MaterialUpdateScreen,
} from './MaterialUpdateScreen';

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
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const materialUpdate = useMaterialUpdateController(materialUpdateUsecase);
  const supplierList = useSupplierListController(supplierListUsecase);
  const router = useRouter();

  useEffect(() => {
    if (materialUpdate.state.type === 'submitSuccess') {
      router.push('/materials');
    }
  }, [materialUpdate.state.type, router]);

  return (
    <MaterialUpdateScreen
      form={materialUpdate.form}
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
      availableSuppliers={supplierList.state.suppliers}
      isLoadingSuppliers={
        supplierList.state.type === 'idle' ||
        supplierList.state.type === 'loading'
      }
    />
  );
};
