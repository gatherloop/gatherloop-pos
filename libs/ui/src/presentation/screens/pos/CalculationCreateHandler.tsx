import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CalculationCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import {
  CalculationCreateScreen,
  CalculationCreateScreenProps,
} from './CalculationCreateScreen';

export type CalculationCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  calculationCreateUsecase: CalculationCreateUsecase;
};

export const CalculationCreateHandler = ({
  authLogoutUsecase,
  calculationCreateUsecase,
}: CalculationCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const calculationCreate = useController(calculationCreateUsecase);

  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (calculationCreate.state.type === 'submitSuccess') {
      toast.show('Create Calculation Success');
      router.push('/calculations');
    } else if (calculationCreate.state.type === 'submitError') {
      toast.show('Create Calculation Error');
    }
  }, [calculationCreate.state.type, toast, router]);

  return (
    <CalculationCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={calculationCreate.state.values}
      getTotalWallet={(totalWallet, walletId) => {
        return isNaN(totalWallet)
          ? calculationCreate.state.wallets.find(
              (wallet) => wallet.id === walletId
            )?.balance ?? 0
          : totalWallet;
      }}
      isSubmitDisabled={
        calculationCreate.state.type === 'submitting' ||
        calculationCreate.state.type === 'submitSuccess'
      }
      isSubmitting={calculationCreate.state.type === 'submitting'}
      serverError={
        calculationCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) =>
        calculationCreate.dispatch({ type: 'SUBMIT', values })
      }
      variant={match(calculationCreate.state)
        .returnType<CalculationCreateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitting',
              'submitSuccess',
              'submitError'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () =>
            calculationCreate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
      walletSelectOptions={calculationCreate.state.wallets.map((wallet) => ({
        label: wallet.name,
        value: wallet.id,
      }))}
    />
  );
};

