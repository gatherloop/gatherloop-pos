import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { TransactionList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { TransactionDeleteAlert } from '../../components/TransactionDeleteAlert';
import { useTransactionListScreenState } from './TransactionListScreen.state';

export const TransactionListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    transactionDeleteId,
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
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
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
    </Layout>
  );
};
