import { Layout } from '../components/base';
import { BudgetList, BudgetListProps } from '../components';

export type BudgetListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: BudgetListProps['variant'];
  isRevalidating?: boolean;
  onEmptyActionPress?: () => void;
};

export const BudgetListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  onEmptyActionPress,
}: BudgetListScreenProps) => {
  return (
    <Layout title="Budgets" onLogoutPress={onLogoutPress}>
      <BudgetList onRetryButtonPress={onRetryButtonPress} variant={variant} isRevalidating={isRevalidating} onEmptyActionPress={onEmptyActionPress} />
    </Layout>
  );
};
