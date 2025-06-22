import {
  ApiAuthRepository,
  ApiCategoryRepository,
  ApiMaterialRepository,
  ApiProductRepository,
  UrlMaterialListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  MaterialListParams,
  MaterialListUsecase,
  ProductUpdateParams,
  ProductUpdateUsecase,
} from '../domain';
import { ProductUpdateScreen as ProductUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductUpdateScreenProps = {
  productUpdateParams: ProductUpdateParams;
  materialListParams: MaterialListParams;
};

export function ProductUpdateScreen({
  productUpdateParams,
  materialListParams,
}: ProductUpdateScreenProps) {
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const categoryRepository = new ApiCategoryRepository(client);
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialListUsecase = new MaterialListUsecase(
    materialRepository,
    materialListQueryRepository,
    materialListParams
  );
  const productUpdateUsecase = new ProductUpdateUsecase(
    productRepository,
    categoryRepository,
    productUpdateParams
  );

  return (
    <ProductUpdateScreenView
      materialListUsecase={materialListUsecase}
      productUpdateUsecase={productUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
