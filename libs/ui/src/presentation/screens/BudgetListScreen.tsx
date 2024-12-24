import { Layout } from '../components/base';
import { BudgetList } from '../components';
import { useBudgetListController } from '../controllers';
import { BudgetListUsecase } from '../../domain';

export type BudgetListScreenProps = {
  budgetListUsecase: BudgetListUsecase;
};

export const BudgetListScreen = (props: BudgetListScreenProps) => {
  const controller = useBudgetListController(props.budgetListUsecase);
  return (
    <Layout title="Budgets">
      <BudgetList {...controller} />
    </Layout>
  );
};
