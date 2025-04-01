// eslint-disable-next-line @nx/enforce-module-boundaries
import { walletList, walletListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import {
  ApiAuthRepository,
  ApiCalculationRepository,
  ApiWalletRepository,
} from '../data';
import { AuthLogoutUsecase, CalculationCreateUsecase } from '../domain';
import { CalculationCreateScreen as CalculationCreateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getCalculationCreateScreenDehydratedState(
  ctx: GetServerSidePropsContext
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: () =>
        walletList({ headers: { Cookie: ctx.req.headers.cookie } }),
    }),
  ]);

  return dehydrate(queryClient);
}

export function CalculationCreateScreen() {
  const client = useQueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const calculationUsecase = new CalculationCreateUsecase(
    calculationRepository,
    walletRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CalculationCreateScreenView
      calculationCreateUsecase={calculationUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
