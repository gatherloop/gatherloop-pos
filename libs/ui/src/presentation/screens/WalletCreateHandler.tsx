import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useWalletCreateController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../../domain';
import { WalletCreateScreen, WalletCreateScreenProps } from './WalletCreateScreen';

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
      defaultValues={walletCreate.state.values}
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
      variant={match(walletCreate.state)
        .returnType<WalletCreateScreenProps['variant']>()
        .with(
          {
            type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError'),
          },
          () => ({ type: 'loaded' })
        )
        .exhaustive()}
    />
  );
};
