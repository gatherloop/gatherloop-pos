import { ApiAuthRepository, ApiSupplierRepository } from '../data';
import { AuthLogoutUsecase, SupplierCreateUsecase } from '../domain';
import { SupplierCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function SupplierCreate() {
  const client = new QueryClient();
  const supplierRepository = new ApiSupplierRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const supplierCreateUsecase = new SupplierCreateUsecase(supplierRepository);

  return (
    <SupplierCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      supplierCreateUsecase={supplierCreateUsecase}
    />
  );
}
