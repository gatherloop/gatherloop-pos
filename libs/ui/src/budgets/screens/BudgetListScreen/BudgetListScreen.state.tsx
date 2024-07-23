// eslint-disable-next-line @nx/enforce-module-boundaries
import { Budget } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type BudgetListScreenParams = {
  budgetDeleteId?: number;
};

const { useParam } = createParam<BudgetListScreenParams>();

export const useBudgetListScreenState = () => {
  const [budgetDeleteId, setBudgetDeleteId] = useParam('budgetDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });

  const router = useRouter();

  const onItemPress = (budget: Budget) => {
    router.push(`/budgets/${budget.id}`);
  };

  const onEditMenuPress = (budget: Budget) => {
    router.push(`/budgets/${budget.id}`);
  };

  const onDeleteMenuPress = (budget: Budget) => {
    setBudgetDeleteId(budget.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/budgets', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setBudgetDeleteId(undefined);
  };

  return {
    budgetDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
