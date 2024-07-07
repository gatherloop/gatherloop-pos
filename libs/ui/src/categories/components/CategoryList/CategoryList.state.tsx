// eslint-disable-next-line @nx/enforce-module-boundaries
import { useCategoryList } from '../../../../../api-contract/src';

export const useCategoryListState = () => {
  const { data, status, error, refetch } = useCategoryList();
  return {
    categories: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
