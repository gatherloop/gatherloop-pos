// eslint-disable-next-line @nx/enforce-module-boundaries
import { useMaterialList } from '../../../../../api-contract/src';

export const useMaterialListState = () => {
  const { data, status, error, refetch } = useMaterialList();
  return {
    materials: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
