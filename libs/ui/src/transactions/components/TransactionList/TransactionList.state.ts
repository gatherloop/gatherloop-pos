// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionList } from '../../../../../api-contract/src';

export const useTransactionListState = () => {
  const { data, status, error, refetch } = useTransactionList();
  return {
    transactions: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
