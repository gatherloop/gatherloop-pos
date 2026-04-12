import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  AuthLogoutUsecase,
  ChecklistSession,
  ChecklistSessionDeleteUsecase,
  ChecklistSessionDetailUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useChecklistSessionDeleteController,
  useChecklistSessionDetailController,
} from '../controllers';
import {
  ChecklistSessionDetailScreen,
  ChecklistSessionDetailScreenProps,
} from './ChecklistSessionDetailScreen';

export type ChecklistSessionDetailHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistSessionDetailUsecase: ChecklistSessionDetailUsecase;
  checklistSessionDeleteUsecase: ChecklistSessionDeleteUsecase;
};

export const ChecklistSessionDetailHandler = ({
  authLogoutUsecase,
  checklistSessionDetailUsecase,
  checklistSessionDeleteUsecase,
}: ChecklistSessionDetailHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistSessionDetail = useChecklistSessionDetailController(
    checklistSessionDetailUsecase
  );
  const checklistSessionDelete = useChecklistSessionDeleteController(
    checklistSessionDeleteUsecase
  );
  const router = useRouter();

  // Navigate back after deletion
  useEffect(() => {
    match(checklistSessionDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        router.push('/checklist-templates');
      })
      .otherwise(() => {
        // noop
      });
  }, [checklistSessionDelete.state, router]);

  const togglingItemId =
    checklistSessionDetail.state.type === 'checkingItem' ||
    checklistSessionDetail.state.type === 'uncheckingItem'
      ? checklistSessionDetail.state.itemId
      : null;

  const togglingSubItemId =
    checklistSessionDetail.state.type === 'checkingSubItem' ||
    checklistSessionDetail.state.type === 'uncheckingSubItem'
      ? checklistSessionDetail.state.subItemId
      : null;

  return (
    <ChecklistSessionDetailScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() =>
        checklistSessionDetail.dispatch({ type: 'FETCH' })
      }
      onCheckItem={(itemId) =>
        checklistSessionDetail.dispatch({ type: 'CHECK_ITEM', itemId })
      }
      onUncheckItem={(itemId) =>
        checklistSessionDetail.dispatch({ type: 'UNCHECK_ITEM', itemId })
      }
      onCheckSubItem={(subItemId) =>
        checklistSessionDetail.dispatch({ type: 'CHECK_SUB_ITEM', subItemId })
      }
      onUncheckSubItem={(subItemId) =>
        checklistSessionDetail.dispatch({ type: 'UNCHECK_SUB_ITEM', subItemId })
      }
      onDeletePress={(session: ChecklistSession) =>
        checklistSessionDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          checklistSessionId: session.id,
        })
      }
      onDeleteConfirm={() =>
        checklistSessionDelete.dispatch({ type: 'DELETE' })
      }
      onDeleteCancel={() =>
        checklistSessionDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      togglingItemId={togglingItemId}
      togglingSubItemId={togglingSubItemId}
      isDeleteModalOpen={match(checklistSessionDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={checklistSessionDelete.state.type === 'deleting'}
      variant={match(checklistSessionDetail.state)
        .returnType<ChecklistSessionDetailScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          {
            type: P.union(
              'loaded',
              'revalidating',
              'checkingItem',
              'uncheckingItem',
              'checkingSubItem',
              'uncheckingSubItem'
            ),
            checklistSession: P.not(P.nullish),
          },
          ({ checklistSession }) => ({
            type: 'loaded',
            checklistSession: checklistSession as ChecklistSession,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .otherwise(() => ({ type: 'loading' }))}
    />
  );
};
