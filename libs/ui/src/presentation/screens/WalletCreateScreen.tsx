import { ScrollView } from 'tamagui';
import { WalletCreate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useWalletCreateController,
} from '../controllers';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../../domain';

export type WalletCreateScreenProps = {
  walletCreateUsecase: WalletCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletCreateScreen = (props: WalletCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const controller = useWalletCreateController(props.walletCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/wallets');
  }, [controller.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Wallet" showBackButton>
      <ScrollView>
        <WalletCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
