import { ScrollView } from 'tamagui';
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
        <WalletForm
          variant={{ type: 'update', walletId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
