import {
  CategoryUpdateScreen,
  CategoryUpdateScreenProps,
  getCategoryUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & CategoryUpdateScreenProps,
  { categoryId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const categoryId = parseInt(ctx.params?.categoryId ?? '');
  const dehydratedState = await getCategoryUpdateScreenDehydratedState(
    ctx,
    categoryId
  );
  return {
    props: { dehydratedState, categoryId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default CategoryUpdateScreen;
