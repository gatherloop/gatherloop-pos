import { match, P } from 'ts-pattern';
import { ExpenseListUsecase } from '../../domain';
import { useController } from './controller';
import { ExpenseListProps } from '../components';

export const useExpenseListController = (usecase: ExpenseListUsecase) => {
  const { state, dispatch } = useController(usecase);

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<ExpenseListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ expenses }) => ({
      type: 'loaded',
      items: expenses,
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
