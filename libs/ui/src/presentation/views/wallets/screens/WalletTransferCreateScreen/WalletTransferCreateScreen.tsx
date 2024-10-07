import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletTransferCreate } from '../../widgets';
import { useWalletTransferCreateController } from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

type ContentProps = {
  walletId: number;
};

const Content = ({ walletId }: ContentProps) => {
  const { state } = useWalletTransferCreateController();
  const router = useRouter();

  useEffect(() => {
    if (state.type === 'submitSuccess')
      router.push(`/wallets/${walletId}/transfers`);
  }, [router, state.type, walletId]);

  return (
    <ScrollView>
      <WalletTransferCreate />
    </ScrollView>
  );
};

export type WalletTransferCreateScreenProps = {
  walletId: number;
};

export const WalletTransferCreateScreen = ({
  walletId,
}: WalletTransferCreateScreenProps) => {
  return (
    <Layout title="Create Transfer" showBackButton>
      <Content walletId={walletId} />
    </Layout>
  );
};
