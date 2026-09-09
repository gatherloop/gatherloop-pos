import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useCallback, useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import {
  AuthLogoutUsecase,
  ChecklistSession,
  ChecklistSessionCreateUsecase,
  ChecklistSessionListFilter,
  ChecklistSessionListUsecase,
  ChecklistTemplate,
} from '../../../domain';
import { useUsecase, useAuthLogout } from '../hooks';
import { useFocusEffect } from '../../../utils';
import {
  ChecklistSessionListScreen,
  ChecklistSessionListScreenProps,
} from '../../views/screens/pos/ChecklistSessionListScreen';

export type ChecklistSessionListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistSessionListUsecase: ChecklistSessionListUsecase;
  checklistSessionCreateUsecase: ChecklistSessionCreateUsecase;
  checklistTemplates: ChecklistTemplate[];
};

export const ChecklistSessionListHandler = ({
  authLogoutUsecase,
  checklistSessionListUsecase,
  checklistSessionCreateUsecase,
  checklistTemplates,
}: ChecklistSessionListHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const checklistSessionList = useUsecase(checklistSessionListUsecase);
  const checklistSessionCreate = useUsecase(checklistSessionCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useFocusEffect(
    useCallback(() => {
      checklistSessionList.dispatch({ type: 'FETCH' });
    }, [checklistSessionList.dispatch])
  );

  useEffect(() => {
    if (checklistSessionCreate.state.type === 'submitSuccess') {
      toast.show('Checklist session created');
      const session = checklistSessionCreate.state.checklistSession;
      router.push(`/checklist-sessions/${session.id}`);
    } else if (checklistSessionCreate.state.type === 'submitError') {
      toast.show('Failed to create checklist session');
    }
  }, [checklistSessionCreate.state, router, toast]);

  return (
    <ChecklistSessionListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onItemPress={(checklistSession: ChecklistSession) =>
        router.push(`/checklist-sessions/${checklistSession.id}`)
      }
      onEmptyActionPress={() => router.push('/checklist-sessions/create')}
      onRetryButtonPress={() =>
        checklistSessionList.dispatch({ type: 'FETCH' })
      }
      isRevalidating={checklistSessionList.state.type === 'revalidating'}
      onFilterChange={(filter: ChecklistSessionListFilter) =>
        checklistSessionList.dispatch({ type: 'CHANGE_PARAMS', filter })
      }
      onPageChange={(page: number) =>
        checklistSessionList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      filter={checklistSessionList.state.filter}
      variant={match(checklistSessionList.state)
        .returnType<ChecklistSessionListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union('changingParams', 'loaded', 'revalidating'),
          },
          ({ checklistSessions }) => ({
            type: checklistSessions.length > 0 ? 'loaded' : 'empty',
            items: checklistSessions,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      currentPage={checklistSessionList.state.page}
      totalItem={checklistSessionList.state.totalItem}
      itemPerPage={checklistSessionList.state.itemPerPage}
      onSubmit={(values) =>
        checklistSessionCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        checklistSessionCreate.state.type === 'submitting' ||
        checklistSessionCreate.state.type === 'submitError' ||
        checklistSessionCreate.state.type === 'submitSuccess'
      }
      isSubmitting={checklistSessionCreate.state.type === 'submitting'}
      checklistTemplates={checklistTemplates}
      createFormVariant={{ type: 'loaded' }}
      createFormDefaultValues={checklistSessionCreate.state.values}
    />
  );
};
