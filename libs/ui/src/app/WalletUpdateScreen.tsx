import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletFindById,
  walletFindByIdQueryKey,
} from '../../../api-contract/src';
import { ApiAuthRepository, ApiWalletRepository } from '../data';
import { AuthLogoutUsecase, WalletUpdateUsecase } from '../domain';
import { WalletUpdateScreen as WalletUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';

export async function getWalletUpdateScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  walletId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: walletFindByIdQueryKey(walletId),
    queryFn: () =>
      walletFindById(walletId, {
        headers: { Cookie: ctx.req.headers.cookie },
      }),
  });
  return dehydrate(queryClient);
}

export type WalletUpdateScreenProps = {
  walletId: number;
};

const { useParam } = createParam<WalletUpdateScreenProps>();

export function WalletUpdateScreen({ walletId }: WalletUpdateScreenProps) {
  const [walletIdParam] = useParam('walletId', {
    initial: walletId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });
  const client = useQueryClient();
  const walletRepository = new ApiWalletRepository(client);
  walletRepository.walletByIdServerParams = walletIdParam;
  const walletUpdateUsecase = new WalletUpdateUsecase(walletRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletUpdateScreenView
      walletUpdateUsecase={walletUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
