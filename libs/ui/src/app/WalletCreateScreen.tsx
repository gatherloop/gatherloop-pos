import { QueryClient } from '@tanstack/react-query';
import { ApiAuthRepository, ApiWalletRepository } from '../data';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../domain';
import { WalletCreateScreen as WalletCreateScreenView } from '../presentation';

export function WalletCreateScreen() {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const walletRepository = new ApiWalletRepository(client);

  const walletCreateUsecase = new WalletCreateUsecase(walletRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletCreateScreenView
      walletCreateUsecase={walletCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
