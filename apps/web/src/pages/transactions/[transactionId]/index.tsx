import {
  ApiProductRepository,
  ApiTransactionRepository,
  getUrlFromCtx,
  TransactionUpdateScreen,
  TransactionUpdateScreenProps,
  UrlProductListQueryRepository,
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
  const productListQueryRepository = new UrlProductListQueryRepository();

  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const transaction = await transactionRepository.fetchTransactionById(
    transactionId,
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  const url = getUrlFromCtx(ctx);
  const page = productListQueryRepository.getPage(url);
  const itemPerPage = productListQueryRepository.getItemPerPage(url);
  const query = productListQueryRepository.getSearchQuery(url);
  const orderBy = productListQueryRepository.getOrderBy(url);
  const sortBy = productListQueryRepository.getSortBy(url);

  const { products, totalItem } = await productRepository.fetchProductList(
    { page, itemPerPage, orderBy, query, sortBy },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      transactionUpdateParams: { transaction, transactionId },
      productListParams: {
        products,
        totalItem,
        itemPerPage,
        orderBy,
        page,
        query,
        sortBy,
      },
    },
  };
};

export default TransactionUpdateScreen;
