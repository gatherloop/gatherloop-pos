import { ScrollView } from 'tamagui';
import {
  ReservationCheckoutFormView,
  Layout,
  ReservationList,
} from '../components';
import {
  useAuthLogoutController,
  useReservationCheckoutController,
  useReservationListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Reservation,
  ReservationCheckoutUsecase,
  ReservationListUsecase,
} from '../../domain';

export type ReservationCheckoutScreenProps = {
  reservationCheckoutUsecase: ReservationCheckoutUsecase;
  reservationListUsecase: ReservationListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ReservationCheckoutScreen = (
  props: ReservationCheckoutScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const reservationCheckoutController = useReservationCheckoutController(
    props.reservationCheckoutUsecase
  );

  const reservationListController = useReservationListController(
    props.reservationListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (reservationListController.checkoutStatus !== 'ongoing') {
      reservationListController.onCheckoutStatusChange('ongoing');
    }
  }, [reservationListController]);

  useEffect(() => {
    if (reservationCheckoutController.state.type === 'submitSuccess') {
      router.push(
        `/transactions/${reservationCheckoutController.state.transactionId}`
      );
    }
  }, [
    reservationCheckoutController.state.transactionId,
    reservationCheckoutController.state.type,
    router,
  ]);

  useEffect(() => {
    if (reservationListController.state.type !== 'loaded') return;
    const searchCode = reservationListController.state.query;
    if (
      reservationCheckoutController.state.values.reservations.some(
        ({ code }) => code === searchCode
      )
    )
      return;

    const reservation = reservationListController.state.reservations.find(
      ({ code }) => code === searchCode
    );

    if (reservation) {
      reservationCheckoutController.onAddItem(reservation);
      reservationListController.onSearchValueChange('');
    }
  }, [reservationCheckoutController, reservationListController]);

  const onItemPress = (reservation: Reservation) => {
    reservationCheckoutController.onAddItem(reservation);
    reservationListController.onSearchValueChange('');
  };

  return (
    <Layout
      {...authLogoutController}
      title="Checkout Reservation"
      showBackButton
    >
      <ScrollView>
        <ReservationCheckoutFormView
          {...reservationCheckoutController}
          ReservationItemSelect={() => (
            <ReservationList
              onItemPress={onItemPress}
              isSearchAutoFocus
              {...reservationListController}
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
