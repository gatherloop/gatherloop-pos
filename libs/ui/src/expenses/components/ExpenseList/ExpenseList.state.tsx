// eslint-disable-next-line @nx/enforce-module-boundaries
import { useExpenseList } from '../../../../../api-contract/src';

export const useExpenseListState = () => {
  const { data, status, error, refetch } = useExpenseList();
  return {
    expenses: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
