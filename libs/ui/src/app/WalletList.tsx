import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletListParams,
  WalletListUsecase,
} from '../domain';
import { WalletListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletListProps = {
  walletListParams: WalletListParams;
};

export function WalletList({ walletListParams }: WalletListProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletListUsecase = new WalletListUsecase(
    walletRepository,
    walletListParams
  );

  return (
    <WalletListHandler
      authLogoutUsecase={authLogoutUsecase}
      walletListUsecase={walletListUsecase}
    />
  );
}
