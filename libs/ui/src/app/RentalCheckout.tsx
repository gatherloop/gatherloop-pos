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
import { RentalCheckoutHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type RentalCheckoutProps = {
  rentalListParams: RentalListParams;
};

export function RentalCheckout({
  rentalListParams,
}: RentalCheckoutProps) {
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
    <RentalCheckoutHandler
      rentalCheckoutUsecase={rentalCheckoutUsecase}
      rentalListUsecase={rentalListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
