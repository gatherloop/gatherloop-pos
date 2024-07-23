// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useRefetchOnFocus,
  useTransactionList,
} from '../../../../../api-contract/src';

export const useTransactionListState = () => {
  const { data, status, error, refetch } = useTransactionList();
  useRefetchOnFocus(refetch);
  return {
    transactions: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
