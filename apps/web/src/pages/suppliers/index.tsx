import {
  ApiSupplierRepository,
  getUrlFromCtx,
  SupplierListScreen,
  SupplierListScreenProps,
  UrlSupplierListQueryRepository,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  SupplierListScreenProps
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
  const supplierRepository = new ApiSupplierRepository(client);
  const supplierListQueryRepository = new UrlSupplierListQueryRepository();
  const page = supplierListQueryRepository.getPage(url);
  const itemPerPage = supplierListQueryRepository.getItemPerPage(url);
  const sortBy = supplierListQueryRepository.getSortBy(url);
  const orderBy = supplierListQueryRepository.getOrderBy(url);
  const query = supplierListQueryRepository.getSearchQuery(url);
  const { suppliers, totalItem } = await supplierRepository.fetchSupplierList(
    {
      page,
      itemPerPage,
      orderBy,
      query,
      sortBy,
    },
    {
      headers: { Cookie: ctx.req.headers.cookie },
    }
  );

  return {
    props: {
      supplierListParams: {
        suppliers,
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

export default SupplierListScreen;
