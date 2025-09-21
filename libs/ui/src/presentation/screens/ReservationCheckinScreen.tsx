import { ScrollView } from 'tamagui';
import {
  ReservationCheckinFormView,
  TransactionItemSelect,
  Layout,
} from '../components';
import {
  useAuthLogoutController,
  useReservationCheckinController,
  useTransactionItemSelectController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ReservationCheckinUsecase,
  TransactionItemSelectUsecase,
} from '../../domain';

export type ReservationCheckinScreenProps = {
  reservationCheckinUsecase: ReservationCheckinUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ReservationCheckinScreen = (
  props: ReservationCheckinScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const reservationCheckinController = useReservationCheckinController(
    props.reservationCheckinUsecase
  );

  const transactionItemSelectController = useTransactionItemSelectController(
    props.transactionItemSelectUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (
      transactionItemSelectController.state.type === 'loadingVariantSuccess' &&
      transactionItemSelectController.state.selectedVariant
    ) {
      reservationCheckinController.onAddItem(
        transactionItemSelectController.state.selectedVariant
      );
    }
  }, [
    reservationCheckinController,
    transactionItemSelectController.state.selectedVariant,
    transactionItemSelectController.state.type,
  ]);

  useEffect(() => {
    if (reservationCheckinController.state.type === 'submitSuccess') {
      router.push(`/reservations`);
    }
  }, [reservationCheckinController.state.type, router]);

  return (
    <Layout
      {...authLogoutController}
      title="Checkin Reservation"
      showBackButton
    >
      <ScrollView>
        <ReservationCheckinFormView
          {...reservationCheckinController}
          ReservationItemSelect={() => (
            <TransactionItemSelect {...transactionItemSelectController} />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
