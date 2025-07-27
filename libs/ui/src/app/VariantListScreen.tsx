import { ApiAuthRepository, ApiVariantRepository } from '../data';
import {
  VariantListUsecase,
  VariantDeleteUsecase,
  AuthLogoutUsecase,
  VariantListParams,
} from '../domain';
import { VariantListScreen as VariantListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';
import { UrlVariantListQueryRepository } from '../data/url/variantListQuery';

export type VariantListScreenProps = {
  variantListParams: VariantListParams;
};

export function VariantListScreen({
  variantListParams,
}: VariantListScreenProps) {
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
    <VariantListScreenView
      variantListUsecase={variantListUsecase}
      variantDeleteUsecase={variantDeleteUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
