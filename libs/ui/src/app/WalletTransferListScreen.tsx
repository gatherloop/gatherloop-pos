import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletDetailParams,
  WalletDetailUsecase,
  WalletTransferListParams,
  WalletTransferListUsecase,
} from '../domain';
import { WalletTransferListScreen as WalletTransferListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletTransferListScreenProps = {
  walletTransferListParams: WalletTransferListParams;
  walletDetailParams: WalletDetailParams;
};

export function WalletTransferListScreen({
  walletTransferListParams,
  walletDetailParams,
}: WalletTransferListScreenProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletTransferListUsecase = new WalletTransferListUsecase(
    walletRepository,
    walletTransferListParams
  );
  const walletDetailUsecase = new WalletDetailUsecase(
    walletRepository,
    walletDetailParams
  );

  return (
    <WalletTransferListScreenView
      walletId={walletDetailParams.walletId}
      walletDetailUsecase={walletDetailUsecase}
      walletTransferListUsecase={walletTransferListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
