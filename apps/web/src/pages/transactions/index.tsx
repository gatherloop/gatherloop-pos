import {
  ApiTransactionRepository,
  ApiWalletRepository,
  getUrlFromCtx,
  TransactionListScreen,
  TransactionListScreenProps,
  UrlTransactionListQueryRepository,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  TransactionListScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionListQueryRepository =
    new UrlTransactionListQueryRepository();
  const walletRepository = new ApiWalletRepository(client);

  const url = getUrlFromCtx(ctx);
  const page = transactionListQueryRepository.getPage(url);
  const itemPerPage = transactionListQueryRepository.getItemPerPage(url);
  const query = transactionListQueryRepository.getSearchQuery(url);
  const orderBy = transactionListQueryRepository.getOrderBy(url);
  const sortBy = transactionListQueryRepository.getSortBy(url);
  const paymentStatus = transactionListQueryRepository.getPaymentStatus(url);
  const walletId = transactionListQueryRepository.getWalletId(url);

  const { totalItem, transactions } =
    await transactionRepository.fetchTransactionList(
      {
        page,
        itemPerPage,
        orderBy,
        query,
        sortBy,
        paymentStatus,
        walletId,
      },
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    );

  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      transactionListParams: {
        totalItem,
        transactions,
        itemPerPage,
        orderBy,
        page,
        paymentStatus,
        query,
        sortBy,
        walletId,
        wallets,
      },
      transactionPayParams: {
        wallets,
      },
    },
  };
};

export default TransactionListScreen;
