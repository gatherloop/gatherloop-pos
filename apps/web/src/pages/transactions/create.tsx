import {
  getTransactionCreateScreenDehydratedState,
  TransactionCreateScreen,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const dehydratedState = await getTransactionCreateScreenDehydratedState(ctx);
  return {
    props: { dehydratedState },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default TransactionCreateScreen;
