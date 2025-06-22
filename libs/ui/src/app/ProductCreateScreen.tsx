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
  ProductCreateParams,
  ProductCreateUsecase,
} from '../domain';
import { ProductCreateScreen as ProductCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductCreateScreenProps = {
  productCreateParams: ProductCreateParams;
  materialListParam: MaterialListParams;
};

export function ProductCreateScreen({
  productCreateParams,
  materialListParam,
}: ProductCreateScreenProps) {
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const categoryRepository = new ApiCategoryRepository(client);
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const materialListUsecase = new MaterialListUsecase(
    materialRepository,
    materialListQueryRepository,
    materialListParam
  );
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const productCreateUsecase = new ProductCreateUsecase(
    productRepository,
    categoryRepository,
    productCreateParams
  );

  return (
    <ProductCreateScreenView
      materialListUsecase={materialListUsecase}
      productCreateUsecase={productCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
