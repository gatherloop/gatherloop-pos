import { ApiAuthRepository, ApiCalculationRepository } from '../data';
import {
  CalculationListUsecase,
  CalculationDeleteUsecase,
  AuthLogoutUsecase,
  CalculationListParams,
  CalculationCompleteUsecase,
} from '../domain';
import { CalculationListScreen as CalculationListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CalculationListScreenProps = {
  calculationListParams: CalculationListParams;
};

export function CalculationListScreen({
  calculationListParams,
}: CalculationListScreenProps) {
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
    <CalculationListScreenView
      calculationDeleteUsecase={calculationDeleteUsecase}
      calculationCompleteUsecase={calculationCompleteUsecase}
      calculationListUsecase={calculationListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
