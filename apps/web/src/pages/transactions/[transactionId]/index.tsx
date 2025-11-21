import {
  ApiTransactionRepository,
  TransactionUpdateScreen,
  TransactionUpdateScreenProps,
  ApiProductRepository,
  ApiCouponRepository,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  TransactionUpdateScreenProps,
  { transactionId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const productRepository = new ApiProductRepository(client);
  const couponRepository = new ApiCouponRepository(client);

  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const transaction = await transactionRepository.fetchTransactionById(
    transactionId,
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  const page = 1;
  const itemPerPage = 100;
  const query = '';
  const orderBy = 'desc';
  const sortBy = 'created_at';

  const { products, totalItem } = await productRepository.fetchProductList(
    { page, itemPerPage, orderBy, query, sortBy, saleType: 'purchase' },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  const coupons = await couponRepository.fetchCouponList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      transactionUpdateParams: { transaction, transactionId },
      transactionItemSelectParams: {
        products,
        totalItem,
        itemPerPage,
        orderBy,
        page,
        query,
        sortBy,
      },
      couponListParams: {
        coupons,
      },
    },
  };
};

export default TransactionUpdateScreen;
