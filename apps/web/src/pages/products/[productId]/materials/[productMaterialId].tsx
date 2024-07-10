import {
  ProductMaterialUpdateScreen,
  getProductMaterialUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../../../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps,
  { productId: string; productMaterialId: string }
> = async (ctx) => {
  const productId = parseInt(ctx.params?.productId ?? '');
  const productMaterialId = parseInt(ctx.params?.productMaterialId ?? '');
  const dehydratedState = await getProductMaterialUpdateScreenDehydratedState(
    productId,
    productMaterialId
  );
  return { props: { dehydratedState } };
};

export default ProductMaterialUpdateScreen;
