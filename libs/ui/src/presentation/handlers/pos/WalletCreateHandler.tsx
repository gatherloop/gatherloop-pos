import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../../../domain';
import { WalletCreateScreen, WalletCreateScreenProps } from '../../screens/pos/WalletCreateScreen';

export type WalletCreateHandlerProps = {
  walletCreateUsecase: WalletCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletCreateHandler = ({
  walletCreateUsecase,
  authLogoutUsecase,
}: WalletCreateHandlerProps) => {
  const router = useRouter();
  const walletCreate = useController(walletCreateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const toast = useToastController();

  useEffect(() => {
    if (walletCreate.state.type === 'submitSuccess') {
      toast.show('Create Wallet Success');
      router.push('/wallets');
    } else if (walletCreate.state.type === 'submitError') {
      toast.show('Create Wallet Error');
    }
  }, [walletCreate.state.type, router, toast]);

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
