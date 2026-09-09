import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import { AuthLogoutUsecase, WalletUpdateUsecase } from '../../../domain';
import { WalletUpdateScreen, WalletUpdateScreenProps } from './WalletUpdateScreen';

export type WalletUpdateHandlerProps = {
  walletUpdateUsecase: WalletUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletUpdateHandler = ({
  walletUpdateUsecase,
  authLogoutUsecase,
}: WalletUpdateHandlerProps) => {
  const router = useRouter();
  const walletUpdate = useController(walletUpdateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const toast = useToastController();

  useEffect(() => {
    if (walletUpdate.state.type === 'submitSuccess') {
      toast.show('Update Wallet Success');
      router.push('/wallets');
    } else if (walletUpdate.state.type === 'submitError') {
      toast.show('Update Wallet Error');
    }
  }, [walletUpdate.state.type, router, toast]);

  return (
    <WalletUpdateScreen
      defaultValues={walletUpdate.state.values}
      onSubmit={(values) =>
        walletUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        walletUpdate.state.type === 'submitting' ||
        walletUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={walletUpdate.state.type === 'submitting'}
      serverError={
        walletUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={match(walletUpdate.state)
        .returnType<WalletUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => walletUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
