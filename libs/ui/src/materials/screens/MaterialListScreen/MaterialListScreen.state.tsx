// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type MaterialListScreenParams = {
  materialDeleteId?: number;
};

const { useParam } = createParam<MaterialListScreenParams>();

export const useMaterialListScreenState = () => {
  const [materialDeleteId, setMaterialDeleteId] = useParam('materialDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });
  const router = useRouter();

  const onItemPress = (material: Material) => {
    router.push(`/materials/${material.id}`);
  };

  const onEditMenuPress = (material: Material) => {
    router.push(`/materials/${material.id}`);
  };

  const onDeleteMenuPress = (material: Material) => {
    setMaterialDeleteId(material.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/materials', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setMaterialDeleteId(undefined);
  };

  return {
    materialDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
