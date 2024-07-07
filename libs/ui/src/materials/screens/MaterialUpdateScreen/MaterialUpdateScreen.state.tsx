import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type MaterialUpdateScreenParams = {
  materialId: number;
};

const { useParam } = createParam<MaterialUpdateScreenParams>();

export const useMaterialUpdateScreenState = (
  props: MaterialUpdateScreenParams
) => {
  const [materialId] = useParam('materialId', {
    initial: props.materialId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const router = useRouter();

  const onSuccess = () => {
    router.push('/materials');
  };

  return { materialId, onSuccess };
};
