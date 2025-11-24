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
import { SupplierListScreen as SupplierListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type SupplierListScreenProps = {
  supplierListParams: SupplierListParams;
};

export function SupplierListScreen({
  supplierListParams,
}: SupplierListScreenProps) {
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
    <SupplierListScreenView
      supplierDeleteUsecase={supplierDeleteUsecase}
      supplierListUsecase={supplierListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
