import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Calculation,
  CalculationCompleteUsecase,
  CalculationDeleteUsecase,
  CalculationListUsecase,
} from '../../domain';
import { CalculationListScreen, CalculationListScreenProps } from './CalculationListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCalculationCompleteController,
  useCalculationDeleteController,
  useCalculationListController,
} from '../controllers';

export type CalculationListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  calculationListUsecase: CalculationListUsecase;
  calculationDeleteUsecase: CalculationDeleteUsecase;
  calculationCompleteUsecase: CalculationCompleteUsecase;
};

export const CalculationListHandler = ({
  authLogoutUsecase,
  calculationListUsecase,
  calculationDeleteUsecase,
  calculationCompleteUsecase,
}: CalculationListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const calculationList = useCalculationListController(calculationListUsecase);
  const calculationDelete = useCalculationDeleteController(
    calculationDeleteUsecase
  );
  const calculationComplete = useCalculationCompleteController(
    calculationCompleteUsecase
  );
  const router = useRouter();

  useEffect(() => {
    match(calculationDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        calculationList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // no-op
      });
  }, [calculationDelete.state, calculationList]);

  useEffect(() => {
    match(calculationComplete.state)
      .with({ type: 'completingSuccess' }, () => {
        calculationList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // no-op
      });
  }, [calculationComplete.state, calculationList]);

  return (
    <CalculationListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(calculation: Calculation) =>
        router.push(`/calculations/${calculation.id}`)
      }
      onItemPress={(calculation: Calculation) =>
        router.push(`/calculations/${calculation.id}`)
      }
      onDeleteMenuPress={(calculation: Calculation) =>
        calculationDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          calculationId: calculation.id,
        })
      }
      onCompleteMenuPress={(calculation: Calculation) =>
        calculationComplete.dispatch({
          type: 'SHOW_CONFIRMATION',
          calculationId: calculation.id,
        })
      }
      onEmptyActionPress={() => router.push('/calculations/create')}
      onRetryButtonPress={() => calculationList.dispatch({ type: 'FETCH' })}
      isRevalidating={calculationList.state.type === 'revalidating'}
      variant={match(calculationList.state)
        .returnType<CalculationListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('loaded', 'revalidating') },
          ({ calculations }) => ({ type: 'loaded', items: calculations })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteModalOpen={match(calculationDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={
        calculationDelete.state.type === 'deleting' ||
        calculationDelete.state.type === 'deletingSuccess'
      }
      onDeleteCancel={() =>
        calculationDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteButtonConfirmPress={() =>
        calculationDelete.dispatch({ type: 'DELETE' })
      }
      isCompleteModalOpen={match(calculationComplete.state.type)
        .with(
          P.union('shown', 'completing', 'completingError', 'completingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isCompleteButtonDisabled={
        calculationComplete.state.type === 'completing' ||
        calculationComplete.state.type === 'completingSuccess'
      }
      onCompleteCancel={() =>
        calculationComplete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onCompleteButtonConfirmPress={() =>
        calculationComplete.dispatch({ type: 'COMPLETE' })
      }
    />
  );
};

