import {
  ExpenseUpdateScreen,
  ExpenseUpdateScreenProps,
  getExpenseUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & ExpenseUpdateScreenProps,
  { expenseId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const expenseId = parseInt(ctx.params?.expenseId ?? '');
  const dehydratedState = await getExpenseUpdateScreenDehydratedState(
    ctx,
    expenseId
  );
  return {
    props: { dehydratedState, expenseId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default ExpenseUpdateScreen;
