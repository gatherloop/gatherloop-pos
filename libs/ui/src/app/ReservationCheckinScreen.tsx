import {
  ApiAuthRepository,
  ApiVariantRepository,
  ApiReservationRepository,
  ApiProductRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ReservationCheckinUsecase,
  TransactionItemSelectUsecase,
  TransactionItemSelectParams,
} from '../domain';
import { ReservationCheckinScreen as ReservationCheckinScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ReservationCheckinScreenProps = {
  transactionItemSelectParams: TransactionItemSelectParams;
};

export function ReservationCheckinScreen({
  transactionItemSelectParams,
}: ReservationCheckinScreenProps) {
  const client = new QueryClient();
  const reservationRepository = new ApiReservationRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const reservationCheckinUsecase = new ReservationCheckinUsecase(
    reservationRepository
  );

  const transactionItemSelectUsecase = new TransactionItemSelectUsecase(
    productRepository,
    variantRepository,
    transactionItemSelectParams
  );

  return (
    <ReservationCheckinScreenView
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      reservationCheckinUsecase={reservationCheckinUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
