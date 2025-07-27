import {
  ApiAuthRepository,
  ApiCategoryRepository,
  ApiProductRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductUpdateParams,
  ProductUpdateUsecase,
} from '../domain';
import { ProductUpdateScreen as ProductUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductUpdateScreenProps = {
  productUpdateParams: ProductUpdateParams;
};

export function ProductUpdateScreen({
  productUpdateParams,
}: ProductUpdateScreenProps) {
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const categoryRepository = new ApiCategoryRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const productUpdateUsecase = new ProductUpdateUsecase(
    productRepository,
    categoryRepository,
    productUpdateParams
  );

  return (
    <ProductUpdateScreenView
      productUpdateUsecase={productUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
