import {
  CategoryListScreen,
  CategoryListScreenProps,
  getCategoryListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { DehydratedState } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  CategoryListScreenProps & { dehydratedState: DehydratedState }
> = async (_ctx) => {
  const dehydratedState = await getCategoryListScreenDehydratedState();
  return { props: { dehydratedState } };
};

export default CategoryListScreen;
