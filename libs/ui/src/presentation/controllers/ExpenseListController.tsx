import { match, P } from 'ts-pattern';
import { ExpenseListUsecase } from '../../domain';
import { useController } from './controller';
import { ExpenseListProps } from '../components';
import { useDebounce } from 'tamagui';

export const useExpenseListController = (usecase: ExpenseListUsecase) => {
  const { state, dispatch } = useController(usecase);

  const debounceUpdateQuery = useDebounce(
    (query: string) =>
      dispatch({
        type: 'CHANGE_PARAMS',
        query,
        page: 1,
      }),
    300
  );

  const onSearchValueChange = (query: string) => {
    debounceUpdateQuery(query);
  };

  const onWalletIdChange = (walletId: number | null) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      walletId,
      page: 1,
    });
  };

  const onBudgetIdChange = (budgetId: number | null) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      budgetId,
      page: 1,
    });
  };

  const onPageChange = (page: number) => {
    dispatch({ type: 'CHANGE_PARAMS', page });
  };

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<ExpenseListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onRetryButtonPress,
    onWalletIdChange,
    onBudgetIdChange,
    onPageChange,
    onSearchValueChange,
    variant,
    expenses: state.expenses,
    searchValue: state.query,
    currentPage: state.page,
    totalItem: state.totalItem,
    itemPerPage: state.itemPerPage,
    wallets: state.wallets,
    walletId: state.walletId,
    budgets: state.budgets,
    budgetId: state.budgetId,
  };
};
