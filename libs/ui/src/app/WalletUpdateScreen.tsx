// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletFindById,
  walletFindByIdQueryKey,
} from '../../../api-contract/src';
import { OpenAPIWalletRepository } from '../data';
import { WalletUpdateUsecase } from '../domain';
import {
  WalletUpdateScreen as WalletUpdateScreenView,
  WalletUpdateProvider,
} from '../presentation';
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

export function WalletUpdateScreen({ walletId }: WalletUpdateScreenProps) {
  const client = useQueryClient();
  const repository = new OpenAPIWalletRepository(client);
  repository.walletByIdServerParams = walletId;
  const usecase = new WalletUpdateUsecase(repository);
  return (
    <WalletUpdateProvider usecase={usecase}>
      <WalletUpdateScreenView />
    </WalletUpdateProvider>
  );
}
