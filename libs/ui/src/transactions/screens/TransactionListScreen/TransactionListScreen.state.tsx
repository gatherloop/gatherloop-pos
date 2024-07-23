// eslint-disable-next-line @nx/enforce-module-boundaries
import { Transaction } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type TransactionListScreenParams = {
  transactionDeleteId?: number;
  transactionPaymentId?: number;
};

const { useParam } = createParam<TransactionListScreenParams>();

export const useTransactionListScreenState = () => {
  const [transactionDeleteId, setTransactionDeleteId] = useParam(
    'transactionDeleteId',
    {
      initial: undefined,
      parse: (value) =>
        Array.isArray(value)
          ? parseInt(value[0])
          : typeof value === 'string'
          ? parseInt(value)
          : undefined,
    }
  );

  const [transactionPaymentId, setTransactionPaymentId] = useParam(
    'transactionPaymentId',
    {
      initial: undefined,
      parse: (value) =>
        Array.isArray(value)
          ? parseInt(value[0])
          : typeof value === 'string'
          ? parseInt(value)
          : undefined,
    }
  );

  const router = useRouter();

  const onItemPress = (transaction: Transaction) => {
    const targetPath = transaction.paidAt
      ? `/transactions/${transaction.id}/detail`
      : `/transactions/${transaction.id}`;
    router.push(targetPath);
  };

  const onEditMenuPress = (transaction: Transaction) => {
    router.push(`/transactions/${transaction.id}`);
  };

  const onDeleteMenuPress = (transaction: Transaction) => {
    setTransactionDeleteId(transaction.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/transactions', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setTransactionDeleteId(undefined);
  };

  const onPaymentMenuPress = (transaction: Transaction) => {
    setTransactionPaymentId(transaction.id);
  };

  const onPaymentSuccess = () => {
    router.replace('/transactions', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onPaymentCancel = () => {
    setTransactionPaymentId(undefined);
  };

  return {
    transactionDeleteId,
    transactionPaymentId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    onPaymentMenuPress,
    onPaymentSuccess,
    onPaymentCancel,
  };
};
