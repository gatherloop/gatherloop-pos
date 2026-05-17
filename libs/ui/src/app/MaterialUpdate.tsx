import {
  ApiAuthRepository,
  ApiMaterialRepository,
  ApiSupplierRepository,
  MockSupplierListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  MaterialUpdateParams,
  MaterialUpdateUsecase,
  SupplierListParams,
  SupplierListUsecase,
} from '../domain';
import { MaterialUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type MaterialUpdateProps = {
  materialUpdateParams: MaterialUpdateParams;
  supplierListParams?: SupplierListParams;
};

export function MaterialUpdate({
  materialUpdateParams,
  supplierListParams,
}: MaterialUpdateProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const materialRepository = new ApiMaterialRepository(client);
  const supplierRepository = new ApiSupplierRepository(client);
  const supplierListQueryRepository = new MockSupplierListQueryRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialUpdateUsecase = new MaterialUpdateUsecase(
    materialRepository,
    materialUpdateParams
  );
  const supplierListUsecase = new SupplierListUsecase(
    supplierRepository,
    supplierListQueryRepository,
    supplierListParams ?? { suppliers: [], totalItem: 0 }
  );

  return (
    <MaterialUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      materialUpdateUsecase={materialUpdateUsecase}
      supplierListUsecase={supplierListUsecase}
    />
  );
}
