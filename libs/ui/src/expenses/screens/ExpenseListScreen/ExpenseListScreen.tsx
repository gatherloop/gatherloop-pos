import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseList, ExpenseDeleteAlert } from '../../components';
import { Link } from 'solito/link';
import { Pencil, Plus, Trash } from '@tamagui/lucide-icons';
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
      <ExpenseList
        onItemPress={onItemPress}
        itemMenus={[
          { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
          { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
        ]}
      />
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
