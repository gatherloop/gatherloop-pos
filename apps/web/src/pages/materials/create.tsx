import {
  ApiSupplierRepository,
  MaterialCreate,
  MaterialCreateProps,
  UrlSupplierListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  MaterialCreateProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const client = new QueryClient();
  const supplierRepository = new ApiSupplierRepository(client);
  const supplierListQueryRepository = new UrlSupplierListQueryRepository();

  const { suppliers, totalItem } = await supplierRepository.fetchSupplierList(
    {
      page: supplierListQueryRepository.getPage(),
      itemPerPage: 100,
      query: '',
      sortBy: supplierListQueryRepository.getSortBy(),
      orderBy: supplierListQueryRepository.getOrderBy(),
    },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      supplierListParams: { suppliers, totalItem },
    },
  };
};

export default MaterialCreate;
