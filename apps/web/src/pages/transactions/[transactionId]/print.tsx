import {
  TransactionPrintScreen,
  TransactionPrintScreenProps,
  getTransactionPrintScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & TransactionPrintScreenProps,
  { transactionId: string }
> = async (ctx) => {
  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const dehydratedState = await getTransactionPrintScreenDehydratedState(
    ctx,
    transactionId
  );
  return { props: { dehydratedState, transactionId } };
};

export default TransactionPrintScreen;
