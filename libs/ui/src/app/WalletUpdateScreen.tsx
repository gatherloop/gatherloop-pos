import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletFindById,
  walletFindByIdQueryKey,
} from '../../../api-contract/src';
import { ApiWalletRepository } from '../data';
import { WalletUpdateUsecase } from '../domain';
import { WalletUpdateScreen as WalletUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getWalletUpdateScreenDehydratedState(
  walletId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: walletFindByIdQueryKey(walletId),
    queryFn: () => walletFindById(walletId),
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
  const repository = new ApiWalletRepository(client);
  repository.walletByIdServerParams = walletIdParam;
  const usecase = new WalletUpdateUsecase(repository);
  return <WalletUpdateScreenView walletUpdateUsecase={usecase} />;
}
