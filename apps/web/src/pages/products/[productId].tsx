import {
  ProductUpdateScreen,
  getProductUpdateScreenDehydratedState,
  ProductUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & ProductUpdateScreenProps,
  { productId: string }
> = async (ctx) => {
  const productId = parseInt(ctx.params?.productId ?? '');
  const dehydratedState = await getProductUpdateScreenDehydratedState(
    productId
  );
  return { props: { dehydratedState, productId } };
};

export default ProductUpdateScreen;
