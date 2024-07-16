import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ExpenseUpdateScreenParams = {
  expenseId: number;
};

const { useParam } = createParam<ExpenseUpdateScreenParams>();

export const useExpenseUpdateScreenState = (
  props: ExpenseUpdateScreenParams
) => {
  const [expenseId] = useParam('expenseId', {
    initial: props.expenseId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const router = useRouter();

  const onSuccess = () => {
    router.push('/expenses');
  };

  return { expenseId, onSuccess };
};
