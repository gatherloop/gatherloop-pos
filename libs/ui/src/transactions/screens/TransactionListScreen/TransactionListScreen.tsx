import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import {
  TransactionList,
  TransactionDeleteAlert,
  TransactionPaymentAlert,
} from '../../components';
import { Link } from 'solito/link';
import { DollarSign, Pencil, Plus, Trash } from '@tamagui/lucide-icons';
import { useTransactionListScreenState } from './TransactionListScreen.state';

export const TransactionListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    transactionDeleteId,
    onPaymentMenuPress,
    onPaymentSuccess,
    onPaymentCancel,
    transactionPaymentId,
  } = useTransactionListScreenState();

  return (
    <Layout
      title="Transactions"
      rightActionItem={
        <Link href="/transactions/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ScrollView>
        <TransactionList
          onItemPress={onItemPress}
          itemMenus={[
            {
              title: 'Pay',
              icon: DollarSign,
              onPress: onPaymentMenuPress,
              isShown: ({ paidAt }) => paidAt === undefined,
            },
            {
              title: 'Edit',
              icon: Pencil,
              onPress: onEditMenuPress,
              isShown: ({ paidAt }) => paidAt === undefined,
            },
            {
              title: 'Delete',
              icon: Trash,
              onPress: onDeleteMenuPress,
              isShown: ({ paidAt }) => paidAt === undefined,
            },
          ]}
        />
      </ScrollView>
      {typeof transactionDeleteId === 'number' && (
        <TransactionDeleteAlert
          transactionId={transactionDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
      {typeof transactionPaymentId === 'number' && (
        <TransactionPaymentAlert
          transactionId={transactionPaymentId}
          onSuccess={onPaymentSuccess}
          onCancel={onPaymentCancel}
        />
      )}
    </Layout>
  );
};
