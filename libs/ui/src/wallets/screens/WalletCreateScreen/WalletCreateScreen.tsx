import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletForm } from '../../components';
import { useWalletCreateScreenState } from './WalletCreateScreen.state';

export const WalletCreateScreen = () => {
  const { onSuccess } = useWalletCreateScreenState();
  return (
    <Layout title="Create Wallet" showBackButton>
      <ScrollView>
        <WalletForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
