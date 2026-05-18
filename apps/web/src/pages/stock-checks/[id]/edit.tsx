import {
  ApiStockCheckRepository,
  StockCheckUpdate,
  StockCheckUpdateProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  StockCheckUpdateProps,
  { id: string }
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
  const stockCheckRepository = new ApiStockCheckRepository(client);

  const stockCheckId = parseInt(ctx.params?.id ?? '');
  const stockCheck = await stockCheckRepository.fetchStockCheckById(stockCheckId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      stockCheckUpdateParams: {
        stockCheck,
        stockCheckId,
      },
    },
  };
};

export default StockCheckUpdate;
