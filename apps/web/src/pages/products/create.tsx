import {
  getProductCreateScreenDehydratedState,
  ProductCreateScreen,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  _ctx
) => {
  const dehydratedState = await getProductCreateScreenDehydratedState();
  return { props: { dehydratedState } };
};

export default ProductCreateScreen;
