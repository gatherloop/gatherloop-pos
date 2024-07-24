// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ProductListScreenParams = {
  productDeleteId?: number;
};

const { useParam } = createParam<ProductListScreenParams>();

export const useProductListScreenState = () => {
  const [productDeleteId, setProductDeleteId] = useParam('productDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });

  const router = useRouter();

  const onItemPress = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const onEditMenuPress = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const onDeleteMenuPress = (product: Product) => {
    setProductDeleteId(product.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/products', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setProductDeleteId(undefined);
  };

  return {
    productDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
