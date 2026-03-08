import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletDetailParams,
  WalletDetailUsecase,
  WalletTransferListParams,
  WalletTransferListUsecase,
} from '../domain';
import { WalletTransferListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletTransferListProps = {
  walletTransferListParams: WalletTransferListParams;
  walletDetailParams: WalletDetailParams;
};

export function WalletTransferList({
  walletTransferListParams,
  walletDetailParams,
}: WalletTransferListProps) {
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
    <WalletTransferListHandler
      walletId={walletDetailParams.walletId}
      authLogoutUsecase={authLogoutUsecase}
      walletDetailUsecase={walletDetailUsecase}
      walletTransferListUsecase={walletTransferListUsecase}
    />
  );
}
