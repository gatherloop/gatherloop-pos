import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, MaterialUpdateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialUpdateController,
} from '../controllers';
import { MaterialUpdateScreen } from './MaterialUpdateScreen';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useSupplierList } from '../../../../api-contract/src';
import { toSupplier } from '../../data/api/supplier.transformer';

export type MaterialUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  materialUpdateUsecase: MaterialUpdateUsecase;
};

export const MaterialUpdateHandler = ({
  authLogoutUsecase,
  materialUpdateUsecase,
}: MaterialUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const materialUpdate = useMaterialUpdateController(materialUpdateUsecase);
  const router = useRouter();

  const { data: supplierData } = useSupplierList({ limit: 1000, sortBy: 'created_at', order: 'asc' });
  const suppliers = supplierData?.data?.map(toSupplier) ?? [];

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
      suppliers={suppliers}
    />
  );
};
