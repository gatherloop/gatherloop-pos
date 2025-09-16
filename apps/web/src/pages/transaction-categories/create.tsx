import {
  ApiProductRepository,
  TransactionCategoryCreateScreen,
  TransactionCategoryCreateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionCategoryCreateScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
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

  return {
    props: { transactionCategoryCreateParams: { products } },
  };
};

export default TransactionCategoryCreateScreen;
