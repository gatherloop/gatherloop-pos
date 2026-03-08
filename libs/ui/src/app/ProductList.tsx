import { ApiAuthRepository, ApiProductRepository } from '../data';
import {
  ProductListUsecase,
  ProductDeleteUsecase,
  AuthLogoutUsecase,
  ProductListParams,
} from '../domain';
import { UrlProductListQueryRepository } from '../data';
import { ProductListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductListProps = {
  productListParams: ProductListParams;
};

export function ProductList({ productListParams }: ProductListProps) {
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
    <ProductListHandler
      authLogoutUsecase={authLogoutUsecase}
      productDeleteUsecase={productDeleteUsecase}
      productListUsecase={productListUsecase}
    />
  );
}
