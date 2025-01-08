import { ScrollView } from 'tamagui';
import { WalletUpdate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useWalletUpdateController,
} from '../controllers';
import { AuthLogoutUsecase, WalletUpdateUsecase } from '../../domain';

export type WalletUpdateScreenProps = {
  walletUpdateUsecase: WalletUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletUpdateScreen = (props: WalletUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const controller = useWalletUpdateController(props.walletUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/wallets');
  }, [controller.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Wallet" showBackButton>
      <ScrollView>
        <WalletUpdate {...controller} />
      </ScrollView>
    </Layout>
  );
};
