import { ScrollView } from 'tamagui';
import { WalletTransferCreate, Layout } from '../components';
import { useWalletTransferCreateController } from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { WalletTransferCreateUsecase } from '../../domain';

export type WalletTransferCreateScreenProps = {
  walletId: number;
  walletTransferCreateUsecase: WalletTransferCreateUsecase;
};

export const WalletTransferCreateScreen = ({
  walletId,
  walletTransferCreateUsecase,
}: WalletTransferCreateScreenProps) => {
  const controller = useWalletTransferCreateController(
    walletTransferCreateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      router.push(`/wallets/${walletId}/transfers`);
  }, [router, controller.state.type, walletId]);

  return (
    <Layout title="Create Transfer" showBackButton>
      <ScrollView>
        <WalletTransferCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
