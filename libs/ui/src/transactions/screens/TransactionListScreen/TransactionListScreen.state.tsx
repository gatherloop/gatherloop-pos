// eslint-disable-next-line @nx/enforce-module-boundaries
import { Transaction } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type TransactionListScreenParams = {
  transactionDeleteId?: number;
};

const { useParam } = createParam<TransactionListScreenParams>();

export const useTransactionListScreenState = () => {
  const [transactionDeleteId, setTransactionDeleteId] = useParam('transactionDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });

  const router = useRouter();

  const onItemPress = (transaction: Transaction) => {
    router.push(`/transactions/${transaction.id}`);
  };

  const onEditMenuPress = (transaction: Transaction) => {
    router.push(`/transactions/${transaction.id}`);
  };

  const onDeleteMenuPress = (transaction: Transaction) => {
    setTransactionDeleteId(transaction.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/transactions');
  };

  const onDeleteCancel = () => {
    setTransactionDeleteId(undefined);
  };

  return {
    transactionDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
