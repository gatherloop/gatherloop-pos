import { ApiAuthRepository, ApiSupplierRepository } from '../data';
import {
  AuthLogoutUsecase,
  SupplierUpdateParams,
  SupplierUpdateUsecase,
} from '../domain';
import { SupplierUpdateScreen as SupplierUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type SupplierUpdateScreenProps = {
  supplierUpdateParams: SupplierUpdateParams;
};

export function SupplierUpdateScreen({
  supplierUpdateParams,
}: SupplierUpdateScreenProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const supplierRepository = new ApiSupplierRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const supplierUpdateUsecase = new SupplierUpdateUsecase(
    supplierRepository,
    supplierUpdateParams
  );

  return (
    <SupplierUpdateScreenView
      supplierUpdateUsecase={supplierUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
