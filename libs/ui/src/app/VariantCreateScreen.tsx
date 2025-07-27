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
  VariantCreateParams,
  VariantCreateUsecase,
} from '../domain';
import { VariantCreateScreen as VariantCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type VariantCreateScreenProps = {
  variantCreateParams: VariantCreateParams;
  materialListParam: MaterialListParams;
};

export function VariantCreateScreen({
  variantCreateParams,
  materialListParam,
}: VariantCreateScreenProps) {
  const client = new QueryClient();
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const materialListUsecase = new MaterialListUsecase(
    materialRepository,
    materialListQueryRepository,
    materialListParam
  );
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const variantCreateUsecase = new VariantCreateUsecase(
    variantRepository,
    productRepository,
    variantCreateParams
  );

  return (
    <VariantCreateScreenView
      materialListUsecase={materialListUsecase}
      variantCreateUsecase={variantCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
