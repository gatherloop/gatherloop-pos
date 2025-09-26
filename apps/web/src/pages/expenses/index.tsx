import {
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiWalletRepository,
  ExpenseListScreen,
  ExpenseListScreenProps,
  getUrlFromCtx,
  UrlExpenseListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ExpenseListScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const expenseListQueryRepository = new UrlExpenseListQueryRepository();

  const url = getUrlFromCtx(ctx);
  const page = expenseListQueryRepository.getPage(url);
  const itemPerPage = expenseListQueryRepository.getItemPerPage(url);
  const query = expenseListQueryRepository.getSearchQuery(url);
  const orderBy = expenseListQueryRepository.getOrderBy(url);
  const sortBy = expenseListQueryRepository.getSortBy(url);
  const walletId = expenseListQueryRepository.getWalletId(url);
  const budgetId = expenseListQueryRepository.getBudgetId(url);

  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const budgetRepository = new ApiBudgetRepository(client);
  const { expenses, totalItem } = await expenseRepository.fetchExpenseList(
    {
      page,
      itemPerPage,
      query,
      orderBy,
      sortBy,
      walletId,
      budgetId,
    },
    {
      headers: { Cookie: ctx.req.headers.cookie },
    }
  );

  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  const budgets = await budgetRepository.fetchBudgetList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      expenseListParams: {
        expenses,
        budgets,
        totalItem,
        wallets,
        budgetId,
        itemPerPage,
        orderBy,
        page,
        query,
        sortBy,
        walletId,
      },
    },
  };
};

export default ExpenseListScreen;
