import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CalculationCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCalculationCreateController,
} from '../controllers';
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
  const calculationCreate = useCalculationCreateController(
    calculationCreateUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (calculationCreate.state.type === 'submitSuccess')
      router.push('/calculations');
  }, [calculationCreate.state.type, router]);

  return (
    <CalculationCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={calculationCreate.form}
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
      onRetryButtonPress={() => calculationCreate.dispatch({ type: 'FETCH' })}
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
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      walletSelectOptions={calculationCreate.state.wallets.map((wallet) => ({
        label: wallet.name,
        value: wallet.id,
      }))}
    />
  );
};

