// eslint-disable-next-line @nx/enforce-module-boundaries
import { useBudgetList } from '../../../../../api-contract/src';

export const useBudgetListState = () => {
  const { data, status, error, refetch } = useBudgetList();
  return {
    budgets: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
