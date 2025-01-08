import {
  WalletTransferListScreen,
  WalletTransferListScreenProps,
  getWalletTransferListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & WalletTransferListScreenProps,
  { walletId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const walletId = parseInt(ctx.params?.walletId ?? '');
  const dehydratedState = await getWalletTransferListScreenDehydratedState(
    ctx,
    walletId
  );
  return {
    props: { dehydratedState, walletId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default WalletTransferListScreen;
