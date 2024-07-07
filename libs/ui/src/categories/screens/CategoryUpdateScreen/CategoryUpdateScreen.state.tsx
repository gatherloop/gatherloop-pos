import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type CategoryUpdateScreenParams = {
  categoryId: number;
};

const { useParam } = createParam<CategoryUpdateScreenParams>();

export const useCategoryUpdateScreenState = (
  props: CategoryUpdateScreenParams
) => {
  const [categoryId] = useParam('categoryId', {
    initial: props.categoryId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const router = useRouter();

  const onSuccess = () => {
    router.push('/categories');
  };

  return { categoryId, onSuccess };
};
