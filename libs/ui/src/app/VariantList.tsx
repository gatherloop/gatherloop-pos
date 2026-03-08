import {
  ApiAuthRepository,
  ApiVariantRepository,
  UrlVariantListQueryRepository,
} from '../data';
import {
  VariantListUsecase,
  VariantDeleteUsecase,
  AuthLogoutUsecase,
  VariantListParams,
} from '../domain';
import { VariantListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type VariantListProps = {
  variantListParams: VariantListParams;
};

export function VariantList({ variantListParams }: VariantListProps) {
  const client = new QueryClient();
  const variantRepository = new ApiVariantRepository(client);
  const variantListQueryRepository = new UrlVariantListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const variantDeleteUsecase = new VariantDeleteUsecase(variantRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const variantListUsecase = new VariantListUsecase(
    variantRepository,
    variantListQueryRepository,
    variantListParams
  );

  return (
    <VariantListHandler
      authLogoutUsecase={authLogoutUsecase}
      variantListUsecase={variantListUsecase}
      variantDeleteUsecase={variantDeleteUsecase}
    />
  );
}
