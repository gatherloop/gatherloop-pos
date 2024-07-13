import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletTransferForm } from '../../components';
import { useWalletTransferCreateScreenState } from './WalletTransferCreateScreen.state';

export type WalletTransferCreateScreenProps = {
  walletId: number;
};

export const WalletTransferCreateScreen = (
  props: WalletTransferCreateScreenProps
) => {
  const { onSuccess, walletId } = useWalletTransferCreateScreenState({
    walletId: props.walletId,
  });
  return (
    <Layout title="Create Transfer" showBackButton>
      <ScrollView>
        <WalletTransferForm walletId={walletId} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
