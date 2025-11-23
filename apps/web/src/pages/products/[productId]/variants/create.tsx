import {
  ApiProductRepository,
  ApiMaterialRepository,
  getUrlFromCtx,
  VariantCreateScreen,
  VariantCreateScreenProps,
  UrlMaterialListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  VariantCreateScreenProps,
  { productId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const productId = parseInt(ctx.params?.productId ?? '');

  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const product = await productRepository.fetchProductById(productId, {
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
      variantCreateParams: { product, productId },
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

export default VariantCreateScreen;
