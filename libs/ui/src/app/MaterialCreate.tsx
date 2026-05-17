import {
  ApiAuthRepository,
  ApiMaterialRepository,
  ApiSupplierRepository,
  MockSupplierListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  MaterialCreateUsecase,
  SupplierListParams,
  SupplierListUsecase,
} from '../domain';
import { MaterialCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type MaterialCreateProps = {
  supplierListParams?: SupplierListParams;
};

export function MaterialCreate({ supplierListParams }: MaterialCreateProps) {
  const client = new QueryClient();
  const materialRepository = new ApiMaterialRepository(client);
  const supplierRepository = new ApiSupplierRepository(client);
  const authRepository = new ApiAuthRepository();
  const supplierListQueryRepository = new MockSupplierListQueryRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialCreateUsecase = new MaterialCreateUsecase(materialRepository);
  const supplierListUsecase = new SupplierListUsecase(
    supplierRepository,
    supplierListQueryRepository,
    supplierListParams ?? { suppliers: [], totalItem: 0 }
  );

  return (
    <MaterialCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      materialCreateUsecase={materialCreateUsecase}
      supplierListUsecase={supplierListUsecase}
    />
  );
}
