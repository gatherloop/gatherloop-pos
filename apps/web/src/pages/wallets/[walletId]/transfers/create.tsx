import {
  WalletTransferCreateScreen,
  WalletTransferCreateScreenProps,
  getWalletTransferCreateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & WalletTransferCreateScreenProps,
  { walletId: string }
> = async (ctx) => {
  const walletId = parseInt(ctx.params?.walletId ?? '');
  const dehydratedState = await getWalletTransferCreateScreenDehydratedState();
  return { props: { dehydratedState, walletId } };
};

export default WalletTransferCreateScreen;
