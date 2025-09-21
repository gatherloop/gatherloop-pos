import { Button, XStack } from 'tamagui';
import { Layout, ReservationList, ReservationDeleteAlert } from '../components';
import { Link } from 'solito/link';
import { Check, Plus } from '@tamagui/lucide-icons';
import {
  useAuthLogoutController,
  useReservationDeleteController,
  useReservationListController,
} from '../controllers';
import { useEffect } from 'react';
import {
  AuthLogoutUsecase,
  Reservation,
  ReservationDeleteUsecase,
  ReservationListUsecase,
} from '../../domain';

export type ReservationListScreenProps = {
  reservationListUsecase: ReservationListUsecase;
  reservationDeleteUsecase: ReservationDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ReservationListScreen = (props: ReservationListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const reservationListController = useReservationListController(
    props.reservationListUsecase
  );
  const reservationDeleteController = useReservationDeleteController(
    props.reservationDeleteUsecase
  );

  useEffect(() => {
    if (reservationDeleteController.state.type === 'deletingSuccess') {
      reservationListController.dispatch({ type: 'FETCH' });
    }
  }, [reservationDeleteController.state.type, reservationListController]);

  const onDeleteMenuPress = (reservation: Reservation) => {
    reservationDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      reservationId: reservation.id,
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Reservations"
      rightActionItem={
        <XStack gap="$3">
          <Link href="/reservations/checkin">
            <Button size="$3" icon={Plus} variant="outlined" disabled>
              Checkin
            </Button>
          </Link>
          <Link href="/reservations/checkout">
            <Button size="$3" icon={Check} variant="outlined" disabled>
              Checkout
            </Button>
          </Link>
        </XStack>
      }
    >
      <ReservationList
        {...reservationListController}
        onDeleteMenuPress={onDeleteMenuPress}
      />
      <ReservationDeleteAlert {...reservationDeleteController} />
    </Layout>
  );
};
