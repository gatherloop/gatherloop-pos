import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  AuthLogoutUsecase,
  ChecklistSession,
  ChecklistSessionCreateUsecase,
  ChecklistSessionListFilter,
  ChecklistSessionListUsecase,
  ChecklistTemplate,
} from '../../domain';
import {
  useAuthLogoutController,
  useChecklistSessionCreateController,
  useChecklistSessionListController,
} from '../controllers';
import {
  ChecklistSessionListScreen,
  ChecklistSessionListScreenProps,
} from './ChecklistSessionListScreen';

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
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistSessionList = useChecklistSessionListController(
    checklistSessionListUsecase
  );
  const checklistSessionCreate = useChecklistSessionCreateController(
    checklistSessionCreateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (checklistSessionCreate.state.type === 'submitSuccess') {
      const session = checklistSessionCreate.state.checklistSession;
      router.push(`/checklist-sessions/${session.id}`);
    }
  }, [checklistSessionCreate.state, router]);

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
      form={checklistSessionCreate.form}
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
    />
  );
};
