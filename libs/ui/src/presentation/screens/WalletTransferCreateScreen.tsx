import { ScrollView } from 'tamagui';
import { WalletTransferCreate, Layout } from '../components';
import {
  useAuthLogoutController,
  useWalletTransferCreateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, WalletTransferCreateUsecase } from '../../domain';

export type WalletTransferCreateScreenProps = {
  walletId: number;
  walletTransferCreateUsecase: WalletTransferCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletTransferCreateScreen = ({
  walletId,
  walletTransferCreateUsecase,
  authLogoutUsecase,
}: WalletTransferCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(authLogoutUsecase);

  const controller = useWalletTransferCreateController(
    walletTransferCreateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      router.push(`/wallets/${walletId}/transfers`);
  }, [router, controller.state.type, walletId]);

  return (
    <Layout {...authLogoutController} title="Create Transfer" showBackButton>
      <ScrollView>
        <WalletTransferCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
