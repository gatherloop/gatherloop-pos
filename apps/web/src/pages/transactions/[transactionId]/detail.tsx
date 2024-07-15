import {
  TransactionDetailScreen,
  TransactionDetailScreenProps,
  getTransactionDetailScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & TransactionDetailScreenProps,
  { transactionId: string }
> = async (ctx) => {
  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const dehydratedState = await getTransactionDetailScreenDehydratedState(
    transactionId
  );
  return { props: { dehydratedState, transactionId } };
};

export default TransactionDetailScreen;
