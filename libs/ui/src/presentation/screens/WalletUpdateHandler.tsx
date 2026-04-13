import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useWalletUpdateController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, WalletUpdateUsecase } from '../../domain';
import { WalletUpdateScreen } from './WalletUpdateScreen';

export type WalletUpdateHandlerProps = {
  walletUpdateUsecase: WalletUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletUpdateHandler = ({
  walletUpdateUsecase,
  authLogoutUsecase,
}: WalletUpdateHandlerProps) => {
  const router = useRouter();
  const walletUpdate = useWalletUpdateController(walletUpdateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (walletUpdate.state.type === 'submitSuccess') router.push('/wallets');
  }, [walletUpdate.state.type, router]);

  return (
    <WalletUpdateScreen
      form={walletUpdate.form}
      onSubmit={(values) =>
        walletUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        walletUpdate.state.type === 'submitting' ||
        walletUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={walletUpdate.state.type === 'submitting'}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={walletUpdate.variant}
    />
  );
};
