import {
  ApiAuthRepository,
  ApiCategoryRepository,
  ApiProductRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductCreateParams,
  ProductCreateUsecase,
} from '../domain';
import { ProductCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductCreateProps = {
  productCreateParams: ProductCreateParams;
};

export function ProductCreate({ productCreateParams }: ProductCreateProps) {
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const categoryRepository = new ApiCategoryRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const productCreateUsecase = new ProductCreateUsecase(
    productRepository,
    categoryRepository,
    productCreateParams
  );

  return (
    <ProductCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      productCreateUsecase={productCreateUsecase}
    />
  );
}
