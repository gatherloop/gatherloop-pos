import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletListParams,
  WalletListUsecase,
} from '../domain';
import { WalletListScreen as WalletListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type WalletListScreenProps = {
  walletListParams: WalletListParams;
};

export function WalletListScreen({ walletListParams }: WalletListScreenProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const walletListUsecase = new WalletListUsecase(
    walletRepository,
    walletListParams
  );

  return (
    <WalletListScreenView
      walletListUsecase={walletListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
