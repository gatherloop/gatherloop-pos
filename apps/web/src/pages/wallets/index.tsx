import { ApiWalletRepository } from '@gatherloop-pos/ui';
import {
  WalletList,
  WalletListProps,
} from '@gatherloop-pos/ui/pos';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  WalletListProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { walletListParams: { wallets } },
  };
};

export default WalletList;
