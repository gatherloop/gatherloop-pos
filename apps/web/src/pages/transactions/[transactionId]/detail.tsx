import {
  ApiTransactionRepository,
  TransactionDetailScreen,
  TransactionDetailScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionDetailScreenProps,
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

  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const transaction = await transactionRepository.fetchTransactionById(
    transactionId,
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: { transactionDetailParams: { transaction, transactionId } },
  };
};

export default TransactionDetailScreen;
