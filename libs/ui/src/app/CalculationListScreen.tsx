// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  calculationList,
  calculationListQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiCalculationRepository } from '../data';
import {
  CalculationListUsecase,
  CalculationDeleteUsecase,
  AuthLogoutUsecase,
} from '../domain';
import { CalculationListScreen as CalculationListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getCalculationListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: calculationListQueryKey({
      sortBy: 'created_at',
      order: 'desc',
    }),
    queryFn: () =>
      calculationList(
        {
          sortBy: 'created_at',
          order: 'desc',
        },
        { headers: { Cookie: ctx.req.headers.cookie } }
      ),
  });
  return dehydrate(client);
}

export function CalculationListScreen() {
  const client = useQueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const calculationListUsecase = new CalculationListUsecase(
    calculationRepository
  );
  const calculationDeleteUsecase = new CalculationDeleteUsecase(
    calculationRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CalculationListScreenView
      calculationDeleteUsecase={calculationDeleteUsecase}
      calculationListUsecase={calculationListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
