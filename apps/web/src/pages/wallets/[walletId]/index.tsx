import {
  ApiWalletRepository,
  WalletUpdateScreen,
  WalletUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  WalletUpdateScreenProps,
  { walletId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const walletId = parseInt(ctx.params?.walletId ?? '');
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);

  const wallet = await walletRepository.fetchWalletById(walletId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { walletUpdateParams: { wallet, walletId } },
  };
};

export default WalletUpdateScreen;
