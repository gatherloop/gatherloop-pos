import {
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiWalletRepository,
  ExpenseUpdateScreen,
  ExpenseUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  ExpenseUpdateScreenProps,
  { expenseId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const expenseId = parseInt(ctx.params?.expenseId ?? '');
  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);

  const expense = await expenseRepository.fetchExpenseById(expenseId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });
  const budgets = await budgetRepository.fetchBudgetList({
    headers: { Cookie: ctx.req.headers.cookie },
  });
  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { expenseUpdateParams: { expense, budgets, expenseId, wallets } },
  };
};

export default ExpenseUpdateScreen;
