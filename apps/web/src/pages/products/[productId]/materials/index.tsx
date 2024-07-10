import {
  ProductMaterialListScreen,
  getProductMaterialListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps,
  { productId: string }
> = async (ctx) => {
  const productId = parseInt(ctx.params?.productId ?? '');
  const dehydratedState = await getProductMaterialListScreenDehydratedState(
    productId
  );
  return { props: { dehydratedState } };
};

export default ProductMaterialListScreen;
