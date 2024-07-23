// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useProductList,
  useRefetchOnFocus,
} from '../../../../../api-contract/src';

export const useProductListState = () => {
  const { data, status, error, refetch } = useProductList();
  useRefetchOnFocus(refetch);
  return {
    products: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
