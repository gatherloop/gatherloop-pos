// eslint-disable-next-line @nx/enforce-module-boundaries
import { useExpenseList } from '../../../../../api-contract/src';

export const useExpenseListState = () => {
  const { data, status, error, refetch } = useExpenseList({
    sortBy: 'created_at',
    order: 'desc',
  });
  return {
    expenses: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
