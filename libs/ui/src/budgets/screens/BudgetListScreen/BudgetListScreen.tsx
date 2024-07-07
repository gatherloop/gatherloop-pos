import { Button, H3, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
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
    <Layout>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <H3>Budgets</H3>
          <Paragraph>Manage your budget</Paragraph>
        </YStack>
        <Link href="/budgets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      </XStack>
      <ScrollView>
        <BudgetList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
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
