import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CalculationUpdateUsecase } from '../../domain';
import { CalculationUpdateScreen, CalculationUpdateScreenProps } from './CalculationUpdateScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCalculationUpdateController,
} from '../controllers';

export type CalculationUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  calculationUpdateUsecase: CalculationUpdateUsecase;
};

export const CalculationUpdateHandler = ({
  authLogoutUsecase,
  calculationUpdateUsecase,
}: CalculationUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const calculationUpdate = useCalculationUpdateController(
    calculationUpdateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (calculationUpdate.state.type === 'submitSuccess') {
      router.push('/calculations');
    }
  }, [calculationUpdate.state.type, router]);

  return (
    <CalculationUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={calculationUpdate.form}
      getTotalWallet={(totalWallet, walletId) => {
        return isNaN(totalWallet)
          ? calculationUpdate.state.wallets.find(
              (wallet) => wallet.id === walletId
            )?.balance ?? 0
          : totalWallet;
      }}
      isSubmitDisabled={calculationUpdate.state.isComplete}
      onRetryButtonPress={() => calculationUpdate.dispatch({ type: 'FETCH' })}
      onSubmit={(values) =>
        calculationUpdate.dispatch({ type: 'SUBMIT', values })
      }
      variant={match(calculationUpdate.state)
        .returnType<CalculationUpdateScreenProps['variant']>()
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
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      walletSelectOptions={calculationUpdate.state.wallets.map((wallet) => ({
        label: wallet.name,
        value: wallet.id,
      }))}
    />
  );
};

