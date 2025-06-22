import {
  ApiAuthRepository,
  ApiCalculationRepository,
  ApiWalletRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  CalculationCreateParams,
  CalculationCreateUsecase,
} from '../domain';
import { CalculationCreateScreen as CalculationCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CalculationCreateScreenProps = {
  calculationCreateParams: CalculationCreateParams;
};

export function CalculationCreateScreen({
  calculationCreateParams,
}: CalculationCreateScreenProps) {
  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const calculationUsecase = new CalculationCreateUsecase(
    calculationRepository,
    walletRepository,
    calculationCreateParams
  );

  return (
    <CalculationCreateScreenView
      calculationCreateUsecase={calculationUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
