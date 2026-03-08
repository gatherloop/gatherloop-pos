import { ApiAuthRepository, ApiSupplierRepository } from '../data';
import {
  AuthLogoutUsecase,
  SupplierUpdateParams,
  SupplierUpdateUsecase,
} from '../domain';
import { SupplierUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type SupplierUpdateProps = {
  supplierUpdateParams: SupplierUpdateParams;
};

export function SupplierUpdate({
  supplierUpdateParams,
}: SupplierUpdateProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const supplierRepository = new ApiSupplierRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const supplierUpdateUsecase = new SupplierUpdateUsecase(
    supplierRepository,
    supplierUpdateParams
  );

  return (
    <SupplierUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      supplierUpdateUsecase={supplierUpdateUsecase}
    />
  );
}
