import {
  ApiCategoryRepository,
  ProductCreateScreen,
  ProductCreateScreenProps,
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

  const client = new QueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const categories = await categoryRepository.fetchCategoryList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { productCreateParams: { categories } },
  };
};

export default ProductCreateScreen;
