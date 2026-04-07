import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import {
  AuthLogoutUsecase,
  ChecklistSession,
  ChecklistSessionListFilter,
  ChecklistSessionListUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useChecklistSessionListController,
} from '../controllers';
import {
  ChecklistSessionListScreen,
  ChecklistSessionListScreenProps,
} from './ChecklistSessionListScreen';

export type ChecklistSessionListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistSessionListUsecase: ChecklistSessionListUsecase;
};

export const ChecklistSessionListHandler = ({
  authLogoutUsecase,
  checklistSessionListUsecase,
}: ChecklistSessionListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistSessionList = useChecklistSessionListController(
    checklistSessionListUsecase
  );
  const router = useRouter();

  return (
    <ChecklistSessionListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onItemPress={(checklistSession: ChecklistSession) =>
        router.push(`/checklist-sessions/${checklistSession.id}`)
      }
      onRetryButtonPress={() =>
        checklistSessionList.dispatch({ type: 'FETCH' })
      }
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
    />
  );
};
