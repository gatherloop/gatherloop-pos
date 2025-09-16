import {
  ApiTransactionCategoryRepository,
  TransactionCategoryListScreen,
  TransactionCategoryListScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionCategoryListScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const transactionCategoryRepository = new ApiTransactionCategoryRepository(
    client
  );

  const transactionCategories =
    await transactionCategoryRepository.fetchTransactionCategoryList({
      headers: { Cookie: ctx.req.headers.cookie },
    });

  return {
    props: {
      transactionCategoryListParams: { transactionCategories },
    },
  };
};

export default TransactionCategoryListScreen;
