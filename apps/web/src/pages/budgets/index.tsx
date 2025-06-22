import {
  ApiBudgetRepository,
  BudgetListScreen,
  BudgetListScreenProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  BudgetListScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const budgetRepository = new ApiBudgetRepository(client);
  const budgets = await budgetRepository.fetchBudgetList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return { props: { budgetListParams: { budgets } } };
};

export default BudgetListScreen;
