import {
  ApiAuthRepository,
  ApiReservationRepository,
  UrlReservationListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ReservationCheckoutUsecase,
  ReservationListParams,
  ReservationListUsecase,
} from '../domain';
import { ReservationCheckoutScreen as ReservationCheckoutScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ReservationCheckoutScreenProps = {
  reservationListParams: ReservationListParams;
};

export function ReservationCheckoutScreen({
  reservationListParams,
}: ReservationCheckoutScreenProps) {
  const client = new QueryClient();
  const reservationRepository = new ApiReservationRepository(client);
  const authRepository = new ApiAuthRepository();
  const reservationListQueryRepository =
    new UrlReservationListQueryRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const reservationCheckoutUsecase = new ReservationCheckoutUsecase(
    reservationRepository
  );
  const reservationListUsecase = new ReservationListUsecase(
    reservationRepository,
    reservationListQueryRepository,
    reservationListParams
  );

  return (
    <ReservationCheckoutScreenView
      reservationListUsecase={reservationListUsecase}
      reservationCheckoutUsecase={reservationCheckoutUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
