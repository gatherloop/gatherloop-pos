import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { Layout } from '../components/base';
import { BudgetList, BudgetListItemProps, BudgetListProps } from '../components';

export type BudgetListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  onEditMenuPress: (budget: BudgetListItemProps) => void;
  onItemPress: (budget: BudgetListItemProps) => void;
  variant: BudgetListProps['variant'];
  isRevalidating?: boolean;
  onEmptyActionPress?: () => void;
};

export const BudgetListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  onEditMenuPress,
  onItemPress,
  variant,
  isRevalidating,
  onEmptyActionPress,
}: BudgetListScreenProps) => {
  return (
    <Layout
      title="Budgets"
      onLogoutPress={onLogoutPress}
      rightActionItem={
        <Link href="/budgets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <BudgetList
        onRetryButtonPress={onRetryButtonPress}
        variant={variant}
        isRevalidating={isRevalidating}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        onEmptyActionPress={onEmptyActionPress}
      />
    </Layout>
  );
};
