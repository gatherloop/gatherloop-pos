import {
  WalletUpdateScreen,
  WalletUpdateScreenProps,
  getWalletUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & WalletUpdateScreenProps,
  { walletId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const walletId = parseInt(ctx.params?.walletId ?? '');
  const dehydratedState = await getWalletUpdateScreenDehydratedState(
    ctx,
    walletId
  );
  return {
    props: { dehydratedState, walletId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default WalletUpdateScreen;
