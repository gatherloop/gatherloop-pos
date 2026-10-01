import {
  ApiAuthRepository,
  ApiMaterialRepository,
  ApiProductRepository,
  ApiTagRepository,
  ApiVariantRepository,
  UrlMaterialListQueryRepository,
} from '../../data';
import {
  AuthLogoutUsecase,
  MaterialListParams,
  MaterialListUsecase,
  TagListUsecase,
  VariantCreateParams,
  VariantCreateUsecase,
} from '../../domain';
import { VariantCreateHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export type VariantCreateProps = {
  variantCreateParams: VariantCreateParams;
  materialListParam: MaterialListParams;
};

export function VariantCreate({
  variantCreateParams,
  materialListParam,
}: VariantCreateProps) {
  const client = new QueryClient();
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const tagRepository = new ApiTagRepository(client);
  const authRepository = new ApiAuthRepository();

  const materialListUsecase = new MaterialListUsecase(
    materialRepository,
    materialListQueryRepository,
    materialListParam
  );
  const tagListUsecase = new TagListUsecase(tagRepository, { tags: [] });
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const variantCreateUsecase = new VariantCreateUsecase(
    variantRepository,
    productRepository,
    variantCreateParams
  );

  return (
    <VariantCreateHandler
      variantCreateUsecase={variantCreateUsecase}
      materialListUsecase={materialListUsecase}
      tagListUsecase={tagListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
