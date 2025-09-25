import { match, P } from 'ts-pattern';
import { CheckoutStatus, ReservationListUsecase } from '../../domain';
import { useController } from './controller';
import { ReservationListProps } from '../components';
import { useDebounce } from 'tamagui';

export const useReservationListController = (
  usecase: ReservationListUsecase
) => {
  const debounceUpdateQuery = useDebounce(
    (query: string) =>
      dispatch({
        type: 'CHANGE_PARAMS',
        query,
        page: 1,
        fetchDebounceDelay: 0,
      }),
    300
  );

  const { state, dispatch } = useController(usecase);

  const onCheckoutStatusChange = (checkoutStatus: CheckoutStatus) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      checkoutStatus,
      page: 1,
      fetchDebounceDelay: 600,
    });
  };

  const onSearchValueChange = (query: string) => {
    debounceUpdateQuery(query);
  };

  const onPageChange = (page: number) => {
    dispatch({ type: 'CHANGE_PARAMS', page });
  };

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<ReservationListProps['variant']>()
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
    checkoutStatus: state.checkoutStatus,
    onCheckoutStatusChange,
    onPageChange,
    onRetryButtonPress,
    variant,
    reservations: state.reservations,
    searchValue: state.query,
    currentPage: state.page,
    totalItem: state.totalItem,
    itemPerPage: state.itemPerPage,
  };
};
