import {
  TransactionCategoryUpdateScreen,
  TransactionCategoryUpdateScreenProps,
  ApiTransactionCategoryRepository,
  ApiProductRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionCategoryUpdateScreenProps,
  { transactionCategoryId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const client = new QueryClient();
  const transactionCategoryRepository = new ApiTransactionCategoryRepository(
    client
  );
  const productRepository = new ApiProductRepository(client);
  const transactionCategoryId = parseInt(
    ctx.params?.transactionCategoryId ?? ''
  );
  const { products } = await productRepository.fetchProductList(
    {
      page: 1,
      itemPerPage: 999999,
      orderBy: 'desc',
      query: '',
      sortBy: 'created_at',
    },
    {
      headers: { Cookie: ctx.req.headers.cookie },
    }
  );
  const transactionCategory =
    await transactionCategoryRepository.fetchTransactionCategoryById(
      transactionCategoryId,
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    );

  return {
    props: {
      transactionCategoryUpdateParams: {
        transactionCategory,
        products,
        transactionCategoryId,
      },
    },
  };
};

export default TransactionCategoryUpdateScreen;
