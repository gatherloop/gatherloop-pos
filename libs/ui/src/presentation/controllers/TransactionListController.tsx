import { match, P } from 'ts-pattern';
import { PaymentStatus, TransactionListUsecase } from '../../domain';
import { useController } from './controller';
import { TransactionListProps } from '../components';

export const useTransactionListController = (
  usecase: TransactionListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const onPaymentStatusChange = (paymentStatus: PaymentStatus) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      paymentStatus,
      page: 1,
      fetchDebounceDelay: 600,
    });
  };

  const onWalletIdChange = (walletId: number | null) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      walletId,
      page: 1,
      fetchDebounceDelay: 600,
    });
  };

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
    paymentStatus: state.paymentStatus,
    onPaymentStatusChange,
    onWalletIdChange,
    onPageChange,
    onRetryButtonPress,
    variant,
    transactions: state.transactions,
    searchValue: state.query,
    currentPage: state.page,
    totalItem: state.totalItem,
    itemPerPage: state.itemPerPage,
    wallets: state.wallets,
    walletId: state.walletId,
  };
};
