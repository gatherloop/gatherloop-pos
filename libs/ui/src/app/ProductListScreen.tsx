import { ApiAuthRepository, ApiProductRepository } from '../data';
import {
  ProductListUsecase,
  ProductDeleteUsecase,
  AuthLogoutUsecase,
  ProductListParams,
} from '../domain';
import { ProductListScreen as ProductListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';
import { UrlProductListQueryRepository } from '../data/url/productListQuery';

export type ProductListScreenProps = {
  productListParams: ProductListParams;
};

export function ProductListScreen({
  productListParams,
}: ProductListScreenProps) {
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const productListQueryRepository = new UrlProductListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const productDeleteUsecase = new ProductDeleteUsecase(productRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const productListUsecase = new ProductListUsecase(
    productRepository,
    productListQueryRepository,
    productListParams
  );

  return (
    <ProductListScreenView
      productListUsecase={productListUsecase}
      productDeleteUsecase={productDeleteUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
