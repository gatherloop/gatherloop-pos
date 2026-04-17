import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import {
  useAuthLogoutController,
  useRentalCheckoutController,
  useRentalListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  RentalCheckoutUsecase,
  RentalListUsecase,
} from '../../domain';
import { RentalCheckoutForm } from '../../domain';
import {
  RentalCheckoutScreen,
  RentalCheckoutScreenProps,
} from './RentalCheckoutScreen';

export type RentalCheckoutHandlerProps = {
  rentalCheckoutUsecase: RentalCheckoutUsecase;
  rentalListUsecase: RentalListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const RentalCheckoutHandler = ({
  rentalCheckoutUsecase,
  rentalListUsecase,
  authLogoutUsecase,
}: RentalCheckoutHandlerProps) => {
  const router = useRouter();

  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const rentalCheckout = useRentalCheckoutController(rentalCheckoutUsecase);
  const rentalList = useRentalListController(rentalListUsecase);

  useEffect(() => {
    if (rentalList.state.checkoutStatus !== 'ongoing') {
      rentalList.dispatch({
        type: 'CHANGE_PARAMS',
        checkoutStatus: 'ongoing',
      });
    }
  }, [rentalList]);

  useEffect(() => {
    if (rentalCheckout.state.type === 'submitSuccess') {
      router.push(
        `/transactions/${rentalCheckout.state.transactionId}`
      );
    }
  }, [
    rentalCheckout.state.transactionId,
    rentalCheckout.state.type,
    router,
  ]);

  useEffect(() => {
    if (rentalList.state.type !== 'loaded') return;

    const searchCode = rentalList.state.query;
    if (
      rentalCheckout.state.values.rentals.some(
        ({ code }) => code === searchCode
      )
    )
      return;

    const rental = rentalList.state.rentals.find(
      ({ code }) => code === searchCode
    );

    if (rental) {
      rentalCheckout.onAddItem(rental);
      rentalList.dispatch({ type: 'CHANGE_PARAMS', query: '' });
    }
  }, [rentalCheckout, rentalList]);

  return (
    <RentalCheckoutScreen
      form={rentalCheckout.form}
      onSubmit={(values: RentalCheckoutForm) =>
        rentalCheckout.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={rentalCheckout.state.type === 'submitting'}
      isSubmitting={rentalCheckout.state.type === 'submitting'}
      serverError={
        rentalCheckout.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      rentalsFieldArray={rentalCheckout.rentalsFieldArray}
      rentalList={{
        searchValue: rentalList.state.query,
        onSearchValueChange: (value) =>
          rentalList.dispatch({
            type: 'CHANGE_PARAMS',
            query: value,
            page: 1,
          }),
        checkoutStatus: rentalList.state.checkoutStatus,
        onCheckoutStatusChange: (checkoutStatus) =>
          rentalList.dispatch({
            type: 'CHANGE_PARAMS',
            checkoutStatus,
          }),
        variant: match(rentalList.state)
          .returnType<RentalCheckoutScreenProps['rentalList']['variant']>()
          .with({ type: P.union('idle', 'loading') }, () => ({
            type: 'loading',
          }))
          .with(
            { type: P.union('changingParams', 'loaded', 'revalidating') },
            () => ({ type: 'loaded' })
          )
          .with({ type: 'error' }, () => ({ type: 'error' }))
          .exhaustive(),
        rentals: rentalList.state.rentals,
        currentPage: rentalList.state.page,
        onPageChange: (page) => {
          rentalList.dispatch({ type: 'CHANGE_PARAMS', page });
        },
        totalItem: rentalList.state.totalItem,
        itemPerPage: rentalList.state.itemPerPage,
        onRetryButtonPress: () =>
          rentalList.dispatch({ type: 'FETCH' }),
        onItemPress: (rental) => {
          rentalCheckout.onAddItem(rental);
          rentalList.dispatch({ type: 'CHANGE_PARAMS', query: '' });
        },
        isSearchAutoFocus: true,
      }}
    />
  );
};
