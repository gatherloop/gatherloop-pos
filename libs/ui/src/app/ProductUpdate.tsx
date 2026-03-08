import {
  ApiAuthRepository,
  ApiCategoryRepository,
  ApiProductRepository,
  ApiVariantRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductUpdateParams,
  ProductUpdateUsecase,
  VariantDeleteUsecase,
} from '../domain';
import { ProductUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ProductUpdateProps = {
  productUpdateParams: ProductUpdateParams;
};

export function ProductUpdate({
  productUpdateParams,
}: ProductUpdateProps) {
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const categoryRepository = new ApiCategoryRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const productUpdateUsecase = new ProductUpdateUsecase(
    productRepository,
    categoryRepository,
    variantRepository,
    productUpdateParams
  );
  const variantDeleteUsecase = new VariantDeleteUsecase(variantRepository);

  return (
    <ProductUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      productUpdateUsecase={productUpdateUsecase}
      variantDeleteUsecase={variantDeleteUsecase}
    />
  );
}
