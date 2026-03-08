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
import { RentalListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type RentalListProps = {
  rentalListParams: RentalListParams;
};

export function RentalList({ rentalListParams }: RentalListProps) {
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
    <RentalListHandler
      authLogoutUsecase={authLogoutUsecase}
      rentalListUsecase={rentalListUsecase}
      rentalDeleteUsecase={rentalDeleteUsecase}
    />
  );
}
