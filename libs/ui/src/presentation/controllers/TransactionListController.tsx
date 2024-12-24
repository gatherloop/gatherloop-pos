import { match, P } from 'ts-pattern';
import { TransactionListUsecase } from '../../domain';
import { useController } from './controller';
import { TransactionListProps } from '../components';

export const useTransactionListController = (
  usecase: TransactionListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const onSearchValueChange = (query: string) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      query,
      page: 1,
      fetchDebounceDelay: 600,
    });
  };

  const onPageChange = (page: number) => {
    dispatch({ type: 'CHANGE_PARAMS', page });
  };

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<TransactionListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      () => ({ type: 'loaded' })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onSearchValueChange,
    onPageChange,
    onRetryButtonPress,
    variant,
    transactions: state.transactions,
    searchValue: state.query,
    currentPage: state.page,
    totalItem: state.totalItem,
    itemPerPage: state.itemPerPage,
  };
};
