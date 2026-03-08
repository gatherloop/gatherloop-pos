import { ApiAuthRepository, ApiCalculationRepository } from '../data';
import {
  CalculationListUsecase,
  CalculationDeleteUsecase,
  AuthLogoutUsecase,
  CalculationListParams,
  CalculationCompleteUsecase,
} from '../domain';
import { CalculationListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CalculationListProps = {
  calculationListParams: CalculationListParams;
};

export function CalculationList({ calculationListParams }: CalculationListProps) {
  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const authRepository = new ApiAuthRepository();

  const calculationDeleteUsecase = new CalculationDeleteUsecase(
    calculationRepository
  );
  const calculationCompleteUsecase = new CalculationCompleteUsecase(
    calculationRepository
  );
  const calculationListUsecase = new CalculationListUsecase(
    calculationRepository,
    calculationListParams
  );
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CalculationListHandler
      authLogoutUsecase={authLogoutUsecase}
      calculationListUsecase={calculationListUsecase}
      calculationDeleteUsecase={calculationDeleteUsecase}
      calculationCompleteUsecase={calculationCompleteUsecase}
    />
  );
}

