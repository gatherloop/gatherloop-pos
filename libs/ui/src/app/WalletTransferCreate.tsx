import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletTransferCreateParams,
  WalletTransferCreateUsecase,
} from '../domain';
import { WalletTransferCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletTransferCreateProps = {
  walletTransferCreateParams: WalletTransferCreateParams;
};

export function WalletTransferCreate({
  walletTransferCreateParams,
}: WalletTransferCreateProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletTransferCreateUsecase = new WalletTransferCreateUsecase(
    walletRepository,
    walletTransferCreateParams
  );

  return (
    <WalletTransferCreateHandler
      walletId={walletTransferCreateParams.fromWalletId}
      walletTransferCreateUsecase={walletTransferCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
