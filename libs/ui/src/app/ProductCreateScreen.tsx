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
import { ProductCreateScreen as ProductCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductCreateScreenProps = {
  productCreateParams: ProductCreateParams;
};

export function ProductCreateScreen({
  productCreateParams,
}: ProductCreateScreenProps) {
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
    <ProductCreateScreenView
      productCreateUsecase={productCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
