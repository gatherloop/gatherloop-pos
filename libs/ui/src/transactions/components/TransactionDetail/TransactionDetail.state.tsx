// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionFindById } from '../../../../../api-contract/src';

export type TransactionDetailStateProps = {
  transactionId: number;
};

export const useTransactionDetailState = ({
  transactionId,
}: TransactionDetailStateProps) => {
  const transaction = useTransactionFindById(transactionId);
  return { transaction };
};
