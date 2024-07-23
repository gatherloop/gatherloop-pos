import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetList } from '../../components';
import { Link } from 'solito/link';
import { Pencil, Plus, Trash } from '@tamagui/lucide-icons';
import { BudgetDeleteAlert } from '../../components/BudgetDeleteAlert';
import { useBudgetListScreenState } from './BudgetListScreen.state';

export const BudgetListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    budgetDeleteId,
  } = useBudgetListScreenState();

  return (
    <Layout
      title="Budgets"
      rightActionItem={
        <Link href="/budgets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ScrollView>
        <BudgetList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
            { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof budgetDeleteId === 'number' && (
        <BudgetDeleteAlert
          budgetId={budgetDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
