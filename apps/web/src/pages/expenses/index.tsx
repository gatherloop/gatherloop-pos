import {
  ExpenseListScreen,
  getExpenseListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  _ctx
) => {
  const dehydratedState = await getExpenseListScreenDehydratedState();
  return { props: { dehydratedState } };
};

export default ExpenseListScreen;
