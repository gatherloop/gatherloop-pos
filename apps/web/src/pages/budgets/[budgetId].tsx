import {
  ApiBudgetRepository,
  BudgetUpdate,
  BudgetUpdateProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  BudgetUpdateProps,
  { budgetId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const client = new QueryClient();
  const budgetRepository = new ApiBudgetRepository(client);
  const budgetId = parseInt(ctx.params?.budgetId ?? '');
  const budget = await budgetRepository.fetchBudgetById(budgetId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { budgetUpdateParams: { budget, budgetId } },
  };
};

export default BudgetUpdate;
