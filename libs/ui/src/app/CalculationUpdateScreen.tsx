import {
  ApiAuthRepository,
  ApiCalculationRepository,
  ApiWalletRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  CalculationUpdateParams,
  CalculationUpdateUsecase,
} from '../domain';
import { CalculationUpdateScreen as CalculationUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CalculationUpdateScreenProps = {
  calculationListParams: CalculationUpdateParams;
};

export function CalculationUpdateScreen({
  calculationListParams,
}: CalculationUpdateScreenProps) {
  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const calculationUpdateUsecase = new CalculationUpdateUsecase(
    calculationRepository,
    walletRepository,
    calculationListParams
  );

  return (
    <CalculationUpdateScreenView
      calculationUpdateUsecase={calculationUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
