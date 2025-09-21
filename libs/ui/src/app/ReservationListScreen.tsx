import {
  ApiAuthRepository,
  ApiReservationRepository,
  UrlReservationListQueryRepository,
} from '../data';
import {
  ReservationListUsecase,
  ReservationDeleteUsecase,
  AuthLogoutUsecase,
  ReservationListParams,
} from '../domain';
import { ReservationListScreen as ReservationListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ReservationListScreenProps = {
  reservationListParams: ReservationListParams;
};

export function ReservationListScreen({
  reservationListParams,
}: ReservationListScreenProps) {
  const client = new QueryClient();
  const reservationRepository = new ApiReservationRepository(client);
  const reservationListQueryRepository =
    new UrlReservationListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const reservationListUsecase = new ReservationListUsecase(
    reservationRepository,
    reservationListQueryRepository,
    reservationListParams
  );
  const reservationDeleteUsecase = new ReservationDeleteUsecase(
    reservationRepository
  );

  return (
    <ReservationListScreenView
      reservationDeleteUsecase={reservationDeleteUsecase}
      reservationListUsecase={reservationListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
