import {
  ApiRentalRepository,
  getUrlFromCtx,
  RentalCheckoutScreen,
  RentalCheckoutScreenProps,
  UrlRentalListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  RentalCheckoutScreenProps
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
  const rentalRepository = new ApiRentalRepository(client);
  const transactionListQueryRepository = new UrlRentalListQueryRepository();

  const url = getUrlFromCtx(ctx);
  const page = transactionListQueryRepository.getPage(url);
  const itemPerPage = transactionListQueryRepository.getItemPerPage(url);
  const query = transactionListQueryRepository.getSearchQuery(url);
  const orderBy = transactionListQueryRepository.getOrderBy(url);
  const sortBy = transactionListQueryRepository.getSortBy(url);
  const checkoutStatus = transactionListQueryRepository.getCheckoutStatus(url);

  const { totalItem, rentals } = await rentalRepository.fetchRentalList(
    {
      page,
      itemPerPage,
      orderBy,
      query,
      sortBy,
      checkoutStatus,
    },
    {
      headers: { Cookie: ctx.req.headers.cookie },
    }
  );

  return {
    props: {
      rentalListParams: {
        totalItem,
        rentals,
        itemPerPage,
        orderBy,
        page,
        checkoutStatus,
        query,
        sortBy,
      },
    },
  };
};

export default RentalCheckoutScreen;
