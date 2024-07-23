import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletForm } from '../../components';
import { useWalletCreateScreenState } from './WalletCreateScreen.state';

export const WalletCreateScreen = () => {
  const { onSuccess } = useWalletCreateScreenState();
  return (
    <Layout title="Create Wallet" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <WalletForm variant={{ type: 'create' }} onSuccess={onSuccess} />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
