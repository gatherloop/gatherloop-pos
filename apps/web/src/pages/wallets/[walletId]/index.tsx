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
  const walletId = parseInt(ctx.params?.walletId ?? '');
  const dehydratedState = await getWalletUpdateScreenDehydratedState(walletId);
  return { props: { dehydratedState, walletId } };
};

export default WalletUpdateScreen;
