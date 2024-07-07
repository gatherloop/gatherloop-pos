import { H3, Paragraph, YStack, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletForm } from '../../components';
import { useWalletCreateScreenState } from './WalletCreateScreen.state';

export const WalletCreateScreen = () => {
  const { onSuccess } = useWalletCreateScreenState();
  return (
    <Layout>
      <YStack>
        <H3>Create Wallet</H3>
        <Paragraph>Make a new wallet</Paragraph>
      </YStack>
      <ScrollView>
        <WalletForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
