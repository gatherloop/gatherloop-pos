import {
  ProductUpdateScreen,
  ProductUpdateScreenProps,
  ApiProductRepository,
  ApiCategoryRepository,
  ApiVariantRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ProductUpdateScreenProps,
  { productId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const categoryRepository = new ApiCategoryRepository(client);
  const variantRepository = new ApiVariantRepository(client);

  const productId = parseInt(ctx.params?.productId ?? '');
  const categories = await categoryRepository.fetchCategoryList({
    headers: { Cookie: ctx.req.headers.cookie },
  });
  const product = await productRepository.fetchProductById(productId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });
  const { variants } = await variantRepository.fetchVariantList(
    {
      itemPerPage: 1000,
      optionValueIds: [],
      orderBy: 'desc',
      page: 1,
      query: '',
      sortBy: 'created_at',
      productId,
    },
    {
      headers: { Cookie: ctx.req.headers.cookie },
    }
  );

  return {
    props: {
      productUpdateParams: { product, categories, productId, variants },
    },
  };
};

export default ProductUpdateScreen;
