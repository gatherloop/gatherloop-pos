import { Layout } from '../components/base';
import { BudgetList } from '../components';
import {
  useAuthLogoutController,
  useBudgetListController,
} from '../controllers';
import { AuthLogoutUsecase, BudgetListUsecase } from '../../domain';

export type BudgetListScreenProps = {
  budgetListUsecase: BudgetListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const BudgetListScreen = (props: BudgetListScreenProps) => {
  const budgetListController = useBudgetListController(props.budgetListUsecase);
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  return (
    <Layout title="Budgets" {...authLogoutController}>
      <BudgetList {...budgetListController} />
    </Layout>
  );
};
