import {
  ApiCategoryRepository,
  CategoryUpdateScreen,
  CategoryUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  CategoryUpdateScreenProps,
  { categoryId: string }
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
  const categoryRepository = new ApiCategoryRepository(client);
  const categoryId = parseInt(ctx.params?.categoryId ?? '');
  const category = await categoryRepository.fetchCategoryById(categoryId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { categoryUpdateParams: { category, categoryId } },
  };
};

export default CategoryUpdateScreen;
