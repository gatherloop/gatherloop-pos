import {
  ApiAuthRepository,
  ApiRentalRepository,
  UrlRentalListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  RentalCheckoutUsecase,
  RentalListParams,
  RentalListUsecase,
} from '../domain';
import { RentalCheckoutScreen as RentalCheckoutScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type RentalCheckoutScreenProps = {
  rentalListParams: RentalListParams;
};

export function RentalCheckoutScreen({
  rentalListParams,
}: RentalCheckoutScreenProps) {
  const client = new QueryClient();
  const rentalRepository = new ApiRentalRepository(client);
  const authRepository = new ApiAuthRepository();
  const rentalListQueryRepository = new UrlRentalListQueryRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const rentalCheckoutUsecase = new RentalCheckoutUsecase(rentalRepository);
  const rentalListUsecase = new RentalListUsecase(
    rentalRepository,
    rentalListQueryRepository,
    rentalListParams
  );

  return (
    <RentalCheckoutScreenView
      rentalListUsecase={rentalListUsecase}
      rentalCheckoutUsecase={rentalCheckoutUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
