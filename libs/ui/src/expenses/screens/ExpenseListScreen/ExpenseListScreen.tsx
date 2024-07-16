import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseList, ExpenseDeleteAlert } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { useExpenseListScreenState } from './ExpenseListScreen.state';

export const ExpenseListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    expenseDeleteId,
  } = useExpenseListScreenState();

  return (
    <Layout
      title="Expenses"
      rightActionItem={
        <Link href="/expenses/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ScrollView>
        <ExpenseList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof expenseDeleteId === 'number' && (
        <ExpenseDeleteAlert
          expenseId={expenseDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
