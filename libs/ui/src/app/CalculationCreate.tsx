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
import { CalculationCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CalculationCreateProps = {
  calculationCreateParams: CalculationCreateParams;
};

export function CalculationCreate({
  calculationCreateParams,
}: CalculationCreateProps) {
  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const calculationCreateUsecase = new CalculationCreateUsecase(
    calculationRepository,
    walletRepository,
    calculationCreateParams
  );

  return (
    <CalculationCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      calculationCreateUsecase={calculationCreateUsecase}
    />
  );
}

