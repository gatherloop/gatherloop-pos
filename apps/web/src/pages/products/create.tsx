import {
  ApiCategoryRepository,
  ApiMaterialRepository,
  getUrlFromCtx,
  ProductCreateScreen,
  ProductCreateScreenProps,
  UrlMaterialListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ProductCreateScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const categories = await categoryRepository.fetchCategoryList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

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
      productCreateParams: { categories },
      materialListParam: {
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

export default ProductCreateScreen;
