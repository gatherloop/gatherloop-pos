import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ProductUpdateScreenParams = {
  productId: number;
};

const { useParam } = createParam<ProductUpdateScreenParams>();

export const useProductUpdateScreenState = (
  props: ProductUpdateScreenParams
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
    router.push('/products');
  };

  return { productId, onSuccess };
};
