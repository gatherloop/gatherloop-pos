import { ApiAuthRepository, ApiAvailabilityRepository } from '../../data';
import {
  AuthLogoutUsecase,
  AvailabilityListUsecase,
  AvailabilityListParams,
  AvailabilityUpdateUsecase,
} from '../../domain';
import { AvailabilityHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export type AvailabilityProps = {
  availabilityListParams: AvailabilityListParams;
};

export function Availability({ availabilityListParams }: AvailabilityProps) {
  const client = new QueryClient();
  const availabilityRepository = new ApiAvailabilityRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const availabilityListUsecase = new AvailabilityListUsecase(
    availabilityRepository,
    availabilityListParams
  );
  const availabilityUpdateUsecase = new AvailabilityUpdateUsecase(
    availabilityRepository
  );

  return (
    <AvailabilityHandler
      authLogoutUsecase={authLogoutUsecase}
      availabilityListUsecase={availabilityListUsecase}
      availabilityUpdateUsecase={availabilityUpdateUsecase}
    />
  );
}
