// eslint-disable-next-line @nx/enforce-module-boundaries
import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletUpdateParams,
  WalletUpdateUsecase,
} from '../domain';
import { WalletUpdateScreen as WalletUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletUpdateScreenProps = {
  walletUpdateParams: WalletUpdateParams;
};

export function WalletUpdateScreen({
  walletUpdateParams,
}: WalletUpdateScreenProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const walletRepository = new ApiWalletRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletUpdateUsecase = new WalletUpdateUsecase(
    walletRepository,
    walletUpdateParams
  );

  return (
    <WalletUpdateScreenView
      walletUpdateUsecase={walletUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
