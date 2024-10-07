import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletCreate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useWalletCreateController } from '../../../../controllers';

const Content = () => {
  const controller = useWalletCreateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/wallets');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <WalletCreate />
    </ScrollView>
  );
};

export const WalletCreateScreen = () => {
  return (
    <Layout title="Create Wallet" showBackButton>
      <Content />
    </Layout>
  );
};
