import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ChecklistTemplate,
  ChecklistTemplateDeleteUsecase,
  ChecklistTemplateListUsecase,
} from '../../domain';
import {
  ChecklistTemplateListScreen,
  ChecklistTemplateListScreenProps,
} from './ChecklistTemplateListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useChecklistTemplateDeleteController,
  useChecklistTemplateListController,
} from '../controllers';

export type ChecklistTemplateListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistTemplateListUsecase: ChecklistTemplateListUsecase;
  checklistTemplateDeleteUsecase: ChecklistTemplateDeleteUsecase;
};

export const ChecklistTemplateListHandler = ({
  authLogoutUsecase,
  checklistTemplateListUsecase,
  checklistTemplateDeleteUsecase,
}: ChecklistTemplateListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistTemplateList = useChecklistTemplateListController(
    checklistTemplateListUsecase
  );
  const checklistTemplateDelete = useChecklistTemplateDeleteController(
    checklistTemplateDeleteUsecase
  );
  const router = useRouter();

  useEffect(() => {
    match(checklistTemplateDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        checklistTemplateList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [checklistTemplateDelete.state, checklistTemplateList]);

  return (
    <ChecklistTemplateListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onDeleteMenuPress={(checklistTemplate: ChecklistTemplate) =>
        checklistTemplateDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          checklistTemplateId: checklistTemplate.id,
        })
      }
      onEditMenuPress={(checklistTemplate: ChecklistTemplate) =>
        router.push(`/checklist-templates/${checklistTemplate.id}`)
      }
      onItemPress={(checklistTemplate: ChecklistTemplate) =>
        router.push(`/checklist-templates/${checklistTemplate.id}`)
      }
      onEmptyActionPress={() => router.push('/checklist-templates/create')}
      onRetryButtonPress={() =>
        checklistTemplateList.dispatch({ type: 'FETCH' })
      }
      isRevalidating={checklistTemplateList.state.type === 'revalidating'}
      variant={match(checklistTemplateList.state)
        .returnType<ChecklistTemplateListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union('changingParams', 'loaded', 'revalidating'),
          },
          ({ checklistTemplates }) => ({
            type: checklistTemplates.length > 0 ? 'loaded' : 'empty',
            items: checklistTemplates,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      checklistTemplates={checklistTemplateList.state.checklistTemplates}
      searchValue={checklistTemplateList.state.query}
      onSearchValueChange={(query: string) =>
        checklistTemplateList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      currentPage={checklistTemplateList.state.page}
      onPageChange={(page: number) =>
        checklistTemplateList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={checklistTemplateList.state.totalItem}
      itemPerPage={checklistTemplateList.state.itemPerPage}
      isDeleteModalOpen={match(checklistTemplateDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={
        checklistTemplateDelete.state.type === 'deleting'
      }
      onDeleteCancel={() =>
        checklistTemplateDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() =>
        checklistTemplateDelete.dispatch({ type: 'DELETE' })
      }
    />
  );
};
