import { ApiAuthRepository, ApiWalletRepository } from '../data';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../domain';
import { WalletCreateScreen as WalletCreateScreenView } from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function WalletCreateScreen() {
  const client = useQueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const walletCreateUsecase = new WalletCreateUsecase(walletRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletCreateScreenView
      walletCreateUsecase={walletCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
