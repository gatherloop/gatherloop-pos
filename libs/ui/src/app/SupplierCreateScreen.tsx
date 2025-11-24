import { ApiAuthRepository, ApiSupplierRepository } from '../data';
import { AuthLogoutUsecase, SupplierCreateUsecase } from '../domain';
import { SupplierCreateScreen as SupplierCreateScreenView } from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function SupplierCreateScreen() {
  const client = useQueryClient();
  const supplierRepository = new ApiSupplierRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const supplierUsecase = new SupplierCreateUsecase(supplierRepository);
  return (
    <SupplierCreateScreenView
      supplierCreateUsecase={supplierUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
