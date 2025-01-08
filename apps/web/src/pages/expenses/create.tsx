import {
  ExpenseCreateScreen,
  getExpenseCreateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const dehydratedState = await getExpenseCreateScreenDehydratedState(ctx);
  return {
    props: { dehydratedState },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default ExpenseCreateScreen;
