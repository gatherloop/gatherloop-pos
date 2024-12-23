import {
  getTransactionCreateScreenDehydratedState,
  TransactionCreateScreen,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const dehydratedState = await getTransactionCreateScreenDehydratedState();
  return { props: { dehydratedState } };
};

export default TransactionCreateScreen;
