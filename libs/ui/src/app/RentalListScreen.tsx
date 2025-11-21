import {
  ApiAuthRepository,
  ApiRentalRepository,
  UrlRentalListQueryRepository,
} from '../data';
import {
  RentalListUsecase,
  RentalDeleteUsecase,
  AuthLogoutUsecase,
  RentalListParams,
} from '../domain';
import { RentalListScreen as RentalListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type RentalListScreenProps = {
  rentalListParams: RentalListParams;
};

export function RentalListScreen({ rentalListParams }: RentalListScreenProps) {
  const client = new QueryClient();
  const rentalRepository = new ApiRentalRepository(client);
  const rentalListQueryRepository = new UrlRentalListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const rentalListUsecase = new RentalListUsecase(
    rentalRepository,
    rentalListQueryRepository,
    rentalListParams
  );
  const rentalDeleteUsecase = new RentalDeleteUsecase(rentalRepository);

  return (
    <RentalListScreenView
      rentalDeleteUsecase={rentalDeleteUsecase}
      rentalListUsecase={rentalListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
