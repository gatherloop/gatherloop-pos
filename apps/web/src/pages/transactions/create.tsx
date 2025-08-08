import {
  ApiProductRepository,
  ApiWalletRepository,
  TransactionCreateScreen,
  TransactionCreateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionCreateScreenProps
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
  const productRepository = new ApiProductRepository(client);
  const walletRepository = new ApiWalletRepository(client);

  const page = 1;
  const itemPerPage = 100;
  const query = '';
  const orderBy = 'desc';
  const sortBy = 'created_at';

  const { products, totalItem } = await productRepository.fetchProductList(
    { page, itemPerPage, orderBy, query, sortBy },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      transactionItemSelectParams: {
        products,
        totalItem,
        itemPerPage,
        orderBy,
        page,
        query,
        sortBy,
      },
      transactionPayParams: {
        wallets,
      },
    },
  };
};

export default TransactionCreateScreen;
