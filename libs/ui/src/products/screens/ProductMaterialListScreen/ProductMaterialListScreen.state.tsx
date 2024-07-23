// eslint-disable-next-line @nx/enforce-module-boundaries
import { ProductMaterial } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ProductMaterialListScreenParams = {
  productId: number;
  productMaterialDeleteId?: number;
};

const { useParam } = createParam<ProductMaterialListScreenParams>();

export const useProductMaterialListScreenState = (
  props: ProductMaterialListScreenParams
) => {
  const [productMaterialDeleteId, setProductMaterialDeleteId] = useParam(
    'productMaterialDeleteId',
    {
      initial: undefined,
      parse: (value) =>
        Array.isArray(value)
          ? parseInt(value[0])
          : typeof value === 'string'
          ? parseInt(value)
          : undefined,
    }
  );

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

  const onItemPress = (productMaterial: ProductMaterial) => {
    router.push(`/products/${productId}/materials/${productMaterial.id}`);
  };

  const onEditMenuPress = (productMaterial: ProductMaterial) => {
    router.push(`/products/${productId}/materials/${productMaterial.id}`);
  };

  const onDeleteMenuPress = (productMaterial: ProductMaterial) => {
    setProductMaterialDeleteId(productMaterial.id);
  };

  const onDeleteSuccess = () => {
    router.replace(`/products/${productId}/materials`, undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setProductMaterialDeleteId(undefined);
  };

  return {
    productId,
    productMaterialDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
