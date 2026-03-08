import { ApiAuthRepository, ApiWalletRepository } from '../data';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../domain';
import { WalletCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function WalletCreate() {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const walletRepository = new ApiWalletRepository(client);

  const walletCreateUsecase = new WalletCreateUsecase(walletRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletCreateHandler
      walletCreateUsecase={walletCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
