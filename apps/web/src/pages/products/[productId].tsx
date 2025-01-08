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
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const productId = parseInt(ctx.params?.productId ?? '');
  const dehydratedState = await getProductUpdateScreenDehydratedState(
    ctx,
    productId
  );
  return {
    props: { dehydratedState, productId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default ProductUpdateScreen;
