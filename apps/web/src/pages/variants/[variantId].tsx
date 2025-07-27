import {
  VariantUpdateScreen,
  VariantUpdateScreenProps,
  ApiVariantRepository,
  ApiProductRepository,
  ApiMaterialRepository,
  UrlMaterialListQueryRepository,
  getUrlFromCtx,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  VariantUpdateScreenProps,
  { variantId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const variantId = parseInt(ctx.params?.variantId ?? '');
  const { products } = await productRepository.fetchProductList(
    {
      itemPerPage: 1000,
      orderBy: 'desc',
      page: 1,
      query: '',
      sortBy: 'created_at',
    },
    {
      headers: { Cookie: ctx.req.headers.cookie },
    }
  );
  const variant = await variantRepository.fetchVariantById(variantId, {
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
      variantUpdateParams: { variant, products, variantId },
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

export default VariantUpdateScreen;
