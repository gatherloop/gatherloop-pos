import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletTransferForm } from '../../components';
import { useWalletTransferScreenState } from './WalletTransferScreen.state';

export type WalletTransferScreenProps = {
  walletId: number;
};

export const WalletTransferScreen = (props: WalletTransferScreenProps) => {
  const { onSuccess, walletId } = useWalletTransferScreenState(props);
  return (
    <Layout title="Wallet Transfer" showBackButton>
      <ScrollView>
        <WalletTransferForm walletId={walletId} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
