import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ChecklistTemplateCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useChecklistTemplateCreateController,
} from '../controllers';
import {
  ChecklistTemplateCreateScreen,
  ChecklistTemplateCreateScreenProps,
} from './ChecklistTemplateCreateScreen';

export type ChecklistTemplateCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistTemplateCreateUsecase: ChecklistTemplateCreateUsecase;
};

export const ChecklistTemplateCreateHandler = ({
  authLogoutUsecase,
  checklistTemplateCreateUsecase,
}: ChecklistTemplateCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistTemplateCreate = useChecklistTemplateCreateController(
    checklistTemplateCreateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (checklistTemplateCreate.state.type === 'submitSuccess') {
      router.push('/checklist-templates');
    }
  }, [checklistTemplateCreate.state.type, router]);

  return (
    <ChecklistTemplateCreateScreen
      defaultValues={checklistTemplateCreate.state.values}
      onSubmit={(values) =>
        checklistTemplateCreate.dispatch({
          type: 'SUBMIT',
          values: {
            ...values,
            items: values.items.map((item, itemIndex) => ({
              ...item,
              displayOrder: itemIndex + 1,
              subItems: item.subItems.map((subItem, subItemIndex) => ({
                ...subItem,
                displayOrder: subItemIndex + 1,
              })),
            })),
          },
        })
      }
      isSubmitDisabled={
        checklistTemplateCreate.state.type === 'submitting' ||
        checklistTemplateCreate.state.type === 'submitError' ||
        checklistTemplateCreate.state.type === 'submitSuccess'
      }
      isSubmitting={checklistTemplateCreate.state.type === 'submitting'}
      serverError={
        checklistTemplateCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      variant={match(checklistTemplateCreate.state)
        .returnType<ChecklistTemplateCreateScreenProps['variant']>()
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with(
          {
            type: P.union('submitting', 'submitSuccess', 'submitError'),
          },
          () => ({ type: 'loaded' })
        )
        .exhaustive()}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
