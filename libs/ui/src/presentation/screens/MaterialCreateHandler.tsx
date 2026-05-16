import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, MaterialCreateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialCreateController,
} from '../controllers';
import { MaterialCreateScreen } from './MaterialCreateScreen';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useSupplierList } from '../../../../api-contract/src';
import { toSupplier } from '../../data/api/supplier.transformer';

export type MaterialCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  materialCreateUsecase: MaterialCreateUsecase;
};

export const MaterialCreateHandler = ({
  authLogoutUsecase,
  materialCreateUsecase,
}: MaterialCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const materialCreate = useMaterialCreateController(materialCreateUsecase);
  const router = useRouter();

  const { data: supplierData } = useSupplierList({ limit: 1000, sortBy: 'created_at', order: 'asc' });
  const suppliers = supplierData?.data?.map(toSupplier) ?? [];

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
      suppliers={suppliers}
    />
  );
};
