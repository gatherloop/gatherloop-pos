import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletTransferCreateParams,
  WalletTransferCreateUsecase,
} from '../domain';
import { WalletTransferCreateScreen as WalletTransferCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletTransferCreateScreenProps = {
  walletTransferCreateParams: WalletTransferCreateParams;
};

export function WalletTransferCreateScreen({
  walletTransferCreateParams,
}: WalletTransferCreateScreenProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletTransferCreateUsecase = new WalletTransferCreateUsecase(
    walletRepository,
    walletTransferCreateParams
  );

  return (
    <WalletTransferCreateScreenView
      walletId={walletTransferCreateParams.fromWalletId}
      walletTransferCreateUsecase={walletTransferCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
