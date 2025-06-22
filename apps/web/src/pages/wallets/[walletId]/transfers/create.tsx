import {
  ApiWalletRepository,
  WalletTransferCreateScreen,
  WalletTransferCreateScreenProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  WalletTransferCreateScreenProps,
  { walletId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const walletId = parseInt(ctx.params?.walletId ?? '');
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { walletTransferCreateParams: { fromWalletId: walletId, wallets } },
  };
};

export default WalletTransferCreateScreen;
