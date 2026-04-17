import { Layout } from '../components/base';
import { BudgetList, BudgetListProps } from '../components';

export type BudgetListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: BudgetListProps['variant'];
  isRevalidating?: boolean;
};

export const BudgetListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
}: BudgetListScreenProps) => {
  return (
    <Layout title="Budgets" onLogoutPress={onLogoutPress}>
      <BudgetList onRetryButtonPress={onRetryButtonPress} variant={variant} isRevalidating={isRevalidating} />
    </Layout>
  );
};
