import {
  WalletListScreen,
  getWalletListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const dehydratedState = await getWalletListScreenDehydratedState(ctx);
  return { props: { dehydratedState } };
};

export default WalletListScreen;
