import {
  CategoryListScreen,
  CategoryListScreenProps,
  getCategoryListScreenInitialProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  CategoryListScreenProps
> = async (_ctx) => {
  const props = await getCategoryListScreenInitialProps();
  return { props };
};

export default CategoryListScreen;
