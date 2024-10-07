import { OpenAPIWalletRepository } from '../data';
import { WalletCreateUsecase } from '../domain';
import {
  WalletCreateProvider,
  WalletCreateScreen as WalletCreateScreenView,
} from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function WalletCreateScreen() {
  const client = useQueryClient();
  const repository = new OpenAPIWalletRepository(client);
  const usecase = new WalletCreateUsecase(repository);
  return (
    <WalletCreateProvider usecase={usecase}>
      <WalletCreateScreenView />
    </WalletCreateProvider>
  );
}
