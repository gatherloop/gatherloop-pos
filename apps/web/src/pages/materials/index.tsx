import {
  ApiMaterialRepository,
  getUrlFromCtx,
  MaterialListScreen,
  MaterialListScreenProps,
  UrlMaterialListQueryRepository,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  MaterialListScreenProps
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
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const page = materialListQueryRepository.getPage(url);
  const itemPerPage = materialListQueryRepository.getItemPerPage(url);
  const sortBy = materialListQueryRepository.getSortBy(url);
  const orderBy = materialListQueryRepository.getOrderBy(url);
  const query = materialListQueryRepository.getSearchQuery(url);
  const { materials, totalItem } = await materialRepository.fetchMaterialList(
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
      materialListParams: {
        materials,
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

export default MaterialListScreen;
