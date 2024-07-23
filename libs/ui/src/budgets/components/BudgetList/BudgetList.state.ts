// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useBudgetList,
  useRefetchOnFocus,
} from '../../../../../api-contract/src';

export const useBudgetListState = () => {
  const { data, status, error, refetch } = useBudgetList();
  useRefetchOnFocus(refetch);
  return {
    budgets: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
