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
  const expenseId = parseInt(ctx.params?.expenseId ?? '');
  const dehydratedState = await getExpenseUpdateScreenDehydratedState(
    expenseId
  );
  return { props: { dehydratedState, expenseId } };
};

export default ExpenseUpdateScreen;
