import { useRouter } from 'solito/router';
import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { match, P } from 'ts-pattern';
import {
  useAuthLogoutController,
  useRentalCheckoutController,
  useRentalListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  Rental,
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

  const formRef = useRef<UseFormReturn<RentalCheckoutForm> | null>(null);

  // Writes through the form the same way an item selection would if it
  // happened from inside the form subtree — see `FormView`'s `formRef`
  // escape hatch. `formRef.current` is only ever null before the form's
  // `loaded` branch mounts, which is not reachable here since a rental
  // pick requires the list (and therefore the form) to already be on screen.
  const addRentalToForm = (rental: Rental) => {
    const form = formRef.current;
    if (!form) return;

    const rentals = form.getValues('rentals');
    if (rentals.some(({ id }) => id === rental.id)) return;

    form.setValue('rentals', [...rentals, rental]);
  };

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
    const currentRentals = formRef.current?.getValues('rentals') ?? [];
    if (currentRentals.some(({ code }) => code === searchCode)) return;

    const rental = rentalList.state.rentals.find(
      ({ code }) => code === searchCode
    );

    if (rental) {
      addRentalToForm(rental);
      rentalList.dispatch({ type: 'CHANGE_PARAMS', query: '' });
    }
  }, [rentalList]);

  return (
    <RentalCheckoutScreen
      variant={{ type: 'loaded' }}
      defaultValues={rentalCheckout.state.values}
      onSubmit={(values: RentalCheckoutForm) =>
        rentalCheckout.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={rentalCheckout.state.type === 'submitting'}
      isSubmitting={rentalCheckout.state.type === 'submitting'}
      isSubmitSuccess={rentalCheckout.state.type === 'submitSuccess'}
      serverError={
        rentalCheckout.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      formRef={formRef}
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
          addRentalToForm(rental);
          rentalList.dispatch({ type: 'CHANGE_PARAMS', query: '' });
        },
        isSearchAutoFocus: true,
      }}
    />
  );
};
