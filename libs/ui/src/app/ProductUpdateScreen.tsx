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
    <ProductUpdateScreenView
      productUpdateUsecase={productUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
      variantDeleteUsecase={variantDeleteUsecase}
    />
  );
}
