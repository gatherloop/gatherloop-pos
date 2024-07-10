import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ProductMaterialCreateScreenParams = {
  productId: number;
};

const { useParam } = createParam<ProductMaterialCreateScreenParams>();

export const useProductCreateScreenState = (
  props: ProductMaterialCreateScreenParams
) => {
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

  return { onSuccess, productId };
};
