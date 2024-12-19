import {
  getWalletTransferCreateScreenDehydratedState,
  WalletTransferCreateScreen,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const dehydratedState = await getWalletTransferCreateScreenDehydratedState();
  return { props: { dehydratedState } };
};

export default WalletTransferCreateScreen;
