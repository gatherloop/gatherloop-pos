import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletUpdateParams,
  WalletUpdateUsecase,
} from '../domain';
import { WalletUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletUpdateProps = {
  walletUpdateParams: WalletUpdateParams;
};

export function WalletUpdate({
  walletUpdateParams,
}: WalletUpdateProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const walletRepository = new ApiWalletRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletUpdateUsecase = new WalletUpdateUsecase(
    walletRepository,
    walletUpdateParams
  );

  return (
    <WalletUpdateHandler
      walletUpdateUsecase={walletUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
