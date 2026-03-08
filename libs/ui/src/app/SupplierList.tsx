import {
  ApiAuthRepository,
  ApiSupplierRepository,
  UrlSupplierListQueryRepository,
} from '../data';
import {
  SupplierListUsecase,
  SupplierDeleteUsecase,
  AuthLogoutUsecase,
  SupplierListParams,
} from '../domain';
import { SupplierListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type SupplierListProps = {
  supplierListParams: SupplierListParams;
};

export function SupplierList({ supplierListParams }: SupplierListProps) {
  const client = new QueryClient();
  const supplierRepository = new ApiSupplierRepository(client);
  const supplierListQueryRepository = new UrlSupplierListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const supplierDeleteUsecase = new SupplierDeleteUsecase(supplierRepository);
  const supplierListUsecase = new SupplierListUsecase(
    supplierRepository,
    supplierListQueryRepository,
    supplierListParams
  );

  return (
    <SupplierListHandler
      authLogoutUsecase={authLogoutUsecase}
      supplierListUsecase={supplierListUsecase}
      supplierDeleteUsecase={supplierDeleteUsecase}
    />
  );
}
