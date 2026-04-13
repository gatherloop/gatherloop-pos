import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, SupplierUpdateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useSupplierUpdateController,
  useAuthLogoutController,
} from '../controllers';
import { SupplierUpdateScreen } from './SupplierUpdateScreen';

export type SupplierUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  supplierUpdateUsecase: SupplierUpdateUsecase;
};

export const SupplierUpdateHandler = ({
  authLogoutUsecase,
  supplierUpdateUsecase,
}: SupplierUpdateHandlerProps) => {
  const supplierUpdate = useSupplierUpdateController(supplierUpdateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const router = useRouter();

  useEffect(() => {
    if (supplierUpdate.state.type === 'submitSuccess')
      router.push('/suppliers');
  }, [supplierUpdate.state.type, router]);

  return (
    <SupplierUpdateScreen
      form={supplierUpdate.form}
      onSubmit={(values) => supplierUpdate.dispatch({ type: 'SUBMIT', values })}
      isSubmitDisabled={
        supplierUpdate.state.type === 'submitting' ||
        supplierUpdate.state.type === 'submitError' ||
        supplierUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={supplierUpdate.state.type === 'submitting'}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
