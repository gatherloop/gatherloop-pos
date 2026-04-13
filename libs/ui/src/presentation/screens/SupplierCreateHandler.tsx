import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, SupplierCreateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useSupplierCreateController,
} from '../controllers';
import { SupplierCreateScreen } from './SupplierCreateScreen';

export type SupplierCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  supplierCreateUsecase: SupplierCreateUsecase;
};

export const SupplierCreateHandler = ({
  authLogoutUsecase,
  supplierCreateUsecase,
}: SupplierCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const supplierCreate = useSupplierCreateController(supplierCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (supplierCreate.state.type === 'submitSuccess') {
      router.push('/suppliers');
    }
  }, [supplierCreate.state.type, router]);

  return (
    <SupplierCreateScreen
      form={supplierCreate.form}
      onSubmit={(values) => supplierCreate.dispatch({ type: 'SUBMIT', values })}
      isSubmitDisabled={
        supplierCreate.state.type === 'submitting' ||
        supplierCreate.state.type === 'submitError' ||
        supplierCreate.state.type === 'submitSuccess'
      }
      isSubmitting={supplierCreate.state.type === 'submitting'}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
