import {
  ApiTransactionRepository,
  getUrlFromCtx,
  TransactionStatisticScreen,
  TransactionStatisticScreenProps,
  UrlTransactionStatisticListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionStatisticScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListQueryRepository =
    new UrlTransactionStatisticListQueryRepository();

  const groupBy = transactionStatisticListQueryRepository.getGroupBy(url);
  const transactionStatistics =
    await transactionRepository.fetchTransactionStatisticList(groupBy, {
      headers: { Cookie: ctx.req.headers.cookie },
    });

  return {
    props: {
      transactionStatisticListParams: { transactionStatistics, groupBy },
    },
  };
};

export default TransactionStatisticScreen;
