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
import { CalculationUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CalculationUpdateProps = {
  calculationUpdateParams: CalculationUpdateParams;
};

export function CalculationUpdate({
  calculationUpdateParams,
}: CalculationUpdateProps) {
  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const calculationUpdateUsecase = new CalculationUpdateUsecase(
    calculationRepository,
    walletRepository,
    calculationUpdateParams
  );

  return (
    <CalculationUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      calculationUpdateUsecase={calculationUpdateUsecase}
    />
  );
}

