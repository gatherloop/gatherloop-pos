import { Button } from 'tamagui';
import {
  Layout,
  TransactionList,
  TransactionDeleteAlert,
  TransactionPaymentAlert,
} from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  useAuthLogoutController,
  useTransactionDeleteController,
  useTransactionListController,
  useTransactionPayController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Transaction,
  TransactionDeleteUsecase,
  TransactionListUsecase,
  TransactionPayUsecase,
} from '../../domain';
import { usePrinter } from '../../utils';
import dayjs from 'dayjs';

export type TransactionListScreenProps = {
  transactionListUsecase: TransactionListUsecase;
  transactionDeleteUsecase: TransactionDeleteUsecase;
  transactionPayUsecase: TransactionPayUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionListScreen = (props: TransactionListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const transactionListController = useTransactionListController(
    props.transactionListUsecase
  );
  const transactionDeleteController = useTransactionDeleteController(
    props.transactionDeleteUsecase
  );
  const transactionPayController = useTransactionPayController(
    props.transactionPayUsecase
  );

  const router = useRouter();
  const { print } = usePrinter();

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
      transactionTotal: transaction.total,
    });
  };

  const onPrintMenuPress = (transaction: Transaction) => {
    print({
      createdAt: dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm'),
      paidAt: transaction.paidAt
        ? dayjs(transaction.paidAt).format('DD/MM/YYYY HH:mm')
        : undefined,
      name: transaction.name,
      items: transaction.transactionItems.map(
        ({ variant, amount, discountAmount }) => ({
          name: variant.name,
          price: variant.price,
          amount,
          discountAmount,
        })
      ),
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Transactions"
      rightActionItem={
        <Link href="/transactions/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <TransactionList
        {...transactionListController}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onPayMenuPress={onPayMenuPress}
        onItemPress={onEditMenuPress}
        onPrintMenuPress={onPrintMenuPress}
      />
      <TransactionDeleteAlert {...transactionDeleteController} />
      <TransactionPaymentAlert {...transactionPayController} />
    </Layout>
  );
};
