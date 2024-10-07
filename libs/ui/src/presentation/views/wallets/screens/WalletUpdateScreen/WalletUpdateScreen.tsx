import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletUpdate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useWalletUpdateController } from '../../../../controllers';

const Content = () => {
  const controller = useWalletUpdateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/wallets');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <WalletUpdate />
    </ScrollView>
  );
};

export const WalletUpdateScreen = () => {
  return (
    <Layout title="Update Wallet" showBackButton>
      <Content />
    </Layout>
  );
};
