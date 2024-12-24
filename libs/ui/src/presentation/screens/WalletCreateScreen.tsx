import { ScrollView } from 'tamagui';
import { WalletCreate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useWalletCreateController } from '../controllers';
import { WalletCreateUsecase } from '../../domain';

export type WalletCreateScreenProps = {
  walletCreateUsecase: WalletCreateUsecase;
};

export const WalletCreateScreen = (props: WalletCreateScreenProps) => {
  const controller = useWalletCreateController(props.walletCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/wallets');
  }, [controller.state.type, router]);

  return (
    <Layout title="Create Wallet" showBackButton>
      <ScrollView>
        <WalletCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
