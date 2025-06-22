import {
  ApiBudgetRepository,
  ApiWalletRepository,
  ExpenseCreateScreen,
  ExpenseCreateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ExpenseCreateScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);

  const budgets = await budgetRepository.fetchBudgetList({
    headers: { Cookie: ctx.req.headers.cookie },
  });
  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { expenseCreateParams: { budgets, wallets } },
  };
};

export default ExpenseCreateScreen;
