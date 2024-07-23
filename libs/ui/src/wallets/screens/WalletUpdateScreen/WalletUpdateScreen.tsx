import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletForm } from '../../components';
import { useWalletUpdateScreenState } from './WalletUpdateScreen.state';

export type WalletUpdateScreenProps = {
  walletId: number;
};

export const WalletUpdateScreen = (props: WalletUpdateScreenProps) => {
  const { walletId, onSuccess } = useWalletUpdateScreenState({
    walletId: props.walletId,
  });
  return (
    <Layout title="Update Wallet" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <WalletForm
              variant={{ type: 'update', walletId }}
              onSuccess={onSuccess}
            />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
