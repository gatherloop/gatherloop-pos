import {
  ApiStockCheckRepository,
  getUrlFromCtx,
  StockCheckList,
  StockCheckListProps,
  UrlStockCheckListQueryRepository,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  StockCheckListProps
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

  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const stockCheckRepository = new ApiStockCheckRepository(client);
  const stockCheckListQueryRepository = new UrlStockCheckListQueryRepository();
  const page = stockCheckListQueryRepository.getPage(url);
  const itemPerPage = stockCheckListQueryRepository.getItemPerPage(url);
  const sortBy = stockCheckListQueryRepository.getSortBy(url);
  const orderBy = stockCheckListQueryRepository.getOrderBy(url);
  const { stockChecks, totalItem } = await stockCheckRepository.fetchStockCheckList(
    { page, itemPerPage, orderBy, sortBy },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      stockCheckListParams: {
        stockChecks,
        totalItem,
        itemPerPage,
        orderBy,
        page,
        sortBy,
      },
    },
  };
};

export default StockCheckList;
