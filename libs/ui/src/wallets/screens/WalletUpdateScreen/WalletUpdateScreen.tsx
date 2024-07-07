import { H3, Paragraph, ScrollView, YStack } from 'tamagui';
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
    <Layout>
      <YStack>
        <H3>Update Wallet</H3>
        <Paragraph>Update your existing wallet</Paragraph>
      </YStack>
      <ScrollView>
        <WalletForm
          variant={{ type: 'update', walletId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
