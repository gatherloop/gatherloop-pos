import { Button } from 'tamagui';
import { Layout } from '../../../base';
import {
  TransactionList,
  TransactionDeleteAlert,
  TransactionPaymentAlert,
} from '../../widgets';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  useTransactionDeleteController,
  useTransactionListController,
  useTransactionPayController,
} from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { Transaction } from '../../../../../domain';

const Content = () => {
  const transactionListController = useTransactionListController();
  const transactionDeleteController = useTransactionDeleteController();
  const transactionPayController = useTransactionPayController();
  const router = useRouter();

  useEffect(() => {
    if (transactionDeleteController.state.type === 'deletingSuccess') {
      transactionListController.dispatch({ type: 'FETCH' });
    }
  }, [transactionDeleteController.state.type, transactionListController]);

  useEffect(() => {
    if (transactionPayController.state.type === 'payingSuccess') {
      transactionListController.dispatch({ type: 'FETCH' });
    }
  }, [transactionListController, transactionPayController.state.type]);

  const onDeleteMenuPress = (transaction: Transaction) => {
    transactionDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      transactionId: transaction.id,
    });
  };

  const onEditMenuPress = (transaction: Transaction) => {
    const targetPath = transaction.paidAt
      ? `/transactions/${transaction.id}/detail`
      : `/transactions/${transaction.id}`;
    router.push(targetPath);
  };

  const onPayMenuPress = (transaction: Transaction) => {
    transactionPayController.dispatch({
      type: 'SHOW_CONFIRMATION',
      transactionId: transaction.id,
    });
  };

  const onPrintMenuPress = (transaction: Transaction) => {
    router.push(`/transactions/${transaction.id}/print`);
  };

  return (
    <>
      <TransactionList
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onPayMenuPress={onPayMenuPress}
        onItemPress={onEditMenuPress}
        onPrintMenuPress={onPrintMenuPress}
      />
      <TransactionDeleteAlert />
      <TransactionPaymentAlert />
    </>
  );
};

export const TransactionListScreen = () => {
  return (
    <Layout
      title="Transactions"
      rightActionItem={
        <Link href="/transactions/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <Content />
    </Layout>
  );
};
