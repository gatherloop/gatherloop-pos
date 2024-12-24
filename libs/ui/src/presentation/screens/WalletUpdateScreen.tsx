import { ScrollView } from 'tamagui';
import { WalletUpdate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useWalletUpdateController } from '../controllers';
import { WalletUpdateUsecase } from '../../domain';

export type WalletUpdateScreenProps = {
  walletUpdateUsecase: WalletUpdateUsecase;
};

export const WalletUpdateScreen = (props: WalletUpdateScreenProps) => {
  const controller = useWalletUpdateController(props.walletUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/wallets');
  }, [controller.state.type, router]);

  return (
    <Layout title="Update Wallet" showBackButton>
      <ScrollView>
        <WalletUpdate {...controller} />
      </ScrollView>
    </Layout>
  );
};
