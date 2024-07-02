// eslint-disable-next-line @nx/enforce-module-boundaries
import { useCategoryList } from '../../../../../api-contract/src';

export const useCategoryListState = () => {
  const { data, status, error, refetch } = useCategoryList();
  return { data, status, error, refetch };
};
