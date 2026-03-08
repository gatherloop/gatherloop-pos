import {
  ApiAuthRepository,
  ApiMaterialRepository,
  ApiProductRepository,
  ApiVariantRepository,
  UrlMaterialListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  MaterialListParams,
  MaterialListUsecase,
  VariantUpdateParams,
  VariantUpdateUsecase,
} from '../domain';
import { VariantUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type VariantUpdateProps = {
  variantUpdateParams: VariantUpdateParams;
  materialListParams: MaterialListParams;
};

export function VariantUpdate({
  variantUpdateParams,
  materialListParams,
}: VariantUpdateProps) {
  const client = new QueryClient();
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialListUsecase = new MaterialListUsecase(
    materialRepository,
    materialListQueryRepository,
    materialListParams
  );
  const variantUpdateUsecase = new VariantUpdateUsecase(
    variantRepository,
    productRepository,
    variantUpdateParams
  );

  return (
    <VariantUpdateHandler
      variantUpdateUsecase={variantUpdateUsecase}
      materialListUsecase={materialListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
