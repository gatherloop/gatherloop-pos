import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type BudgetUpdateScreenParams = {
  budgetId: number;
};

const { useParam } = createParam<BudgetUpdateScreenParams>();

export const useBudgetUpdateScreenState = (props: BudgetUpdateScreenParams) => {
  const [budgetId] = useParam('budgetId', {
    initial: props.budgetId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const router = useRouter();

  const onSuccess = () => {
    router.push('/budgets');
  };

  return { budgetId, onSuccess };
};
