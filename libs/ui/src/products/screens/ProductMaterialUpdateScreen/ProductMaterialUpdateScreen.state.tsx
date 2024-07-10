import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ProductMaterialUpdateScreenParams = {
  productMaterialId: number;
  productId: number;
};

const { useParam } = createParam<ProductMaterialUpdateScreenParams>();

export const useProductMaterialUpdateScreenState = (
  props: ProductMaterialUpdateScreenParams
) => {
  const [productMaterialId] = useParam('productMaterialId', {
    initial: props.productMaterialId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const [productId] = useParam('productId', {
    initial: props.productId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const router = useRouter();

  const onSuccess = () => {
    router.push(`/products/${productId}/materials`);
  };

  return { productId, productMaterialId, onSuccess };
};
