import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useWalletCreateController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../../domain';
import { WalletCreateScreen } from './WalletCreateScreen';

export type WalletCreateHandlerProps = {
  walletCreateUsecase: WalletCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletCreateHandler = ({
  walletCreateUsecase,
  authLogoutUsecase,
}: WalletCreateHandlerProps) => {
  const router = useRouter();
  const walletCreate = useWalletCreateController(walletCreateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (walletCreate.state.type === 'submitSuccess') router.push('/wallets');
  }, [walletCreate.state.type, router]);

  return (
    <WalletCreateScreen
      form={walletCreate.form}
      onSubmit={(values) =>
        walletCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        walletCreate.state.type === 'submitting' ||
        walletCreate.state.type === 'submitSuccess'
      }
      isSubmitting={walletCreate.state.type === 'submitting'}
      serverError={
        walletCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
