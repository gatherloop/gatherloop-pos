// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useCategoryList,
  useRefetchOnFocus,
} from '../../../../../api-contract/src';

export const useCategoryListState = () => {
  const { data, status, error, refetch } = useCategoryList();

  useRefetchOnFocus(refetch);

  return {
    categories: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
