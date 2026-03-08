import { Layout } from '../components/base';
import { BudgetList, BudgetListProps } from '../components';

export type BudgetListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: BudgetListProps['variant'];
};

export const BudgetListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
}: BudgetListScreenProps) => {
  return (
    <Layout title="Budgets" onLogoutPress={onLogoutPress}>
      <BudgetList onRetryButtonPress={onRetryButtonPress} variant={variant} />
    </Layout>
  );
};
