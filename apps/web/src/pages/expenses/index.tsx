import {
  ApiExpenseRepository,
  ExpenseListScreen,
  ExpenseListScreenProps,
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

  const client = new QueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const expenses = await expenseRepository.fetchExpenseList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { expenseListParams: { expenses } },
  };
};

export default ExpenseListScreen;
