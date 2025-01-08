import {
  TransactionUpdateScreen,
  TransactionUpdateScreenProps,
  getTransactionUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & TransactionUpdateScreenProps,
  { transactionId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const dehydratedState = await getTransactionUpdateScreenDehydratedState(
    ctx,
    transactionId
  );
  return {
    props: { dehydratedState, transactionId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default TransactionUpdateScreen;
