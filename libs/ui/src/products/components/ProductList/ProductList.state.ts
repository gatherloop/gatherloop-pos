// eslint-disable-next-line @nx/enforce-module-boundaries
import { useProductList } from '../../../../../api-contract/src';

export const useProductListState = () => {
  const { data, status, error, refetch } = useProductList();
  return {
    products: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
