import {
  BudgetUpdateScreen,
  BudgetUpdateScreenProps,
  getBudgetUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & BudgetUpdateScreenProps,
  { budgetId: string }
> = async (ctx) => {
  const budgetId = parseInt(ctx.params?.budgetId ?? '');
  const dehydratedState = await getBudgetUpdateScreenDehydratedState(budgetId);
  return { props: { dehydratedState, budgetId } };
};

export default BudgetUpdateScreen;
