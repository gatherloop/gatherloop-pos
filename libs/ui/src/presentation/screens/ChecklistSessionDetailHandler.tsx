import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  AuthLogoutUsecase,
  ChecklistSession,
  ChecklistSessionDeleteUsecase,
  ChecklistSessionDetailUsecase,
  ChecklistSessionItemToggleUsecase,
  ChecklistSessionSubItemToggleUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useChecklistSessionDeleteController,
  useChecklistSessionDetailController,
  useChecklistSessionItemToggleController,
  useChecklistSessionSubItemToggleController,
} from '../controllers';
import {
  ChecklistSessionDetailScreen,
  ChecklistSessionDetailScreenProps,
} from './ChecklistSessionDetailScreen';

export type ChecklistSessionDetailHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistSessionDetailUsecase: ChecklistSessionDetailUsecase;
  checklistSessionDeleteUsecase: ChecklistSessionDeleteUsecase;
  checklistSessionItemToggleUsecase: ChecklistSessionItemToggleUsecase;
  checklistSessionSubItemToggleUsecase: ChecklistSessionSubItemToggleUsecase;
};

export const ChecklistSessionDetailHandler = ({
  authLogoutUsecase,
  checklistSessionDetailUsecase,
  checklistSessionDeleteUsecase,
  checklistSessionItemToggleUsecase,
  checklistSessionSubItemToggleUsecase,
}: ChecklistSessionDetailHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistSessionDetail = useChecklistSessionDetailController(
    checklistSessionDetailUsecase
  );
  const checklistSessionDelete = useChecklistSessionDeleteController(
    checklistSessionDeleteUsecase
  );
  const itemToggle = useChecklistSessionItemToggleController(
    checklistSessionItemToggleUsecase
  );
  const subItemToggle = useChecklistSessionSubItemToggleController(
    checklistSessionSubItemToggleUsecase
  );
  const router = useRouter();

  // Refresh session after item toggle succeeds
  useEffect(() => {
    if (
      itemToggle.state.type === 'toggleSuccess' ||
      subItemToggle.state.type === 'toggleSuccess'
    ) {
      checklistSessionDetail.dispatch({ type: 'FETCH' });
    }
  }, [itemToggle.state.type, subItemToggle.state.type, checklistSessionDetail]);

  console.log('subItemToggle', subItemToggle.state.type);

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
    itemToggle.state.type === 'checking' ||
    itemToggle.state.type === 'unchecking'
      ? itemToggle.state.itemId
      : null;

  const togglingSubItemId =
    subItemToggle.state.type === 'checking' ||
    subItemToggle.state.type === 'unchecking'
      ? subItemToggle.state.subItemId
      : null;

  return (
    <ChecklistSessionDetailScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() =>
        checklistSessionDetail.dispatch({ type: 'FETCH' })
      }
      onCheckItem={(itemId) => itemToggle.dispatch({ type: 'CHECK', itemId })}
      onUncheckItem={(itemId) =>
        itemToggle.dispatch({ type: 'UNCHECK', itemId })
      }
      onCheckSubItem={(subItemId) =>
        subItemToggle.dispatch({ type: 'CHECK', subItemId })
      }
      onUncheckSubItem={(subItemId) =>
        subItemToggle.dispatch({ type: 'UNCHECK', subItemId })
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
          { type: 'loaded', checklistSession: P.not(P.nullish) },
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
