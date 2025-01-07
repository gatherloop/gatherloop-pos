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
  const categoryId = parseInt(ctx.params?.categoryId ?? '');
  const dehydratedState = await getCategoryUpdateScreenDehydratedState(
    ctx,
    categoryId
  );
  return { props: { dehydratedState, categoryId } };
};

export default CategoryUpdateScreen;
