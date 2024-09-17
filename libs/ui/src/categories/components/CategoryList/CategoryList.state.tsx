// eslint-disable-next-line @nx/enforce-module-boundaries
import { Category, useCategoryList } from '../../../../../api-contract/src';
import { PostMessageEvent, usePostMessage } from '../../../base';
import { useRouter } from 'solito/router';

export const useCategoryListState = () => {
  const router = useRouter();

  const { data, status, error, refetch } = useCategoryList();

  const onReceiveMessage = (event: PostMessageEvent) => {
    if (event.type === 'CategoryDeleteSuccess') {
      refetch();
    }
  };

  const { postMessage } = usePostMessage(onReceiveMessage);

  const onDeleteMenuPress = (category: Category) => {
    postMessage({
      type: 'CategoryDeleteConfirmation',
      categoryId: category.id,
    });
  };

  const onEditMenuPress = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  return {
    categories: data?.data ?? [],
    status,
    error,
    refetch,
    onDeleteMenuPress,
    onEditMenuPress,
  };
};
