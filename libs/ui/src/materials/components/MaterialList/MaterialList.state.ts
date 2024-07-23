// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useMaterialList,
  useRefetchOnFocus,
} from '../../../../../api-contract/src';

export const useMaterialListState = () => {
  const { data, status, error, refetch } = useMaterialList();
  useRefetchOnFocus(refetch);
  return {
    materials: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
