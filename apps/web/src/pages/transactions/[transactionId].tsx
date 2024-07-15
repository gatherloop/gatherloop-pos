import {
  TransactionUpdateScreen,
  TransactionUpdateScreenProps,
  getTransactionUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & TransactionUpdateScreenProps,
  { transactionId: string }
> = async (ctx) => {
  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const dehydratedState = await getTransactionUpdateScreenDehydratedState(
    transactionId
  );
  return { props: { dehydratedState, transactionId } };
};

export default TransactionUpdateScreen;
