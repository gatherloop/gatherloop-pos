import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ChecklistTemplateCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import {
  ChecklistTemplateCreateScreen,
  ChecklistTemplateCreateScreenProps,
} from '../../screens/pos/ChecklistTemplateCreateScreen';

export type ChecklistTemplateCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistTemplateCreateUsecase: ChecklistTemplateCreateUsecase;
};

export const ChecklistTemplateCreateHandler = ({
  authLogoutUsecase,
  checklistTemplateCreateUsecase,
}: ChecklistTemplateCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistTemplateCreate = useController(checklistTemplateCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (checklistTemplateCreate.state.type === 'submitSuccess') {
      toast.show('Create Checklist Template Success');
      router.push('/checklist-templates');
    } else if (checklistTemplateCreate.state.type === 'submitError') {
      toast.show('Create Checklist Template Error');
    }
  }, [checklistTemplateCreate.state.type, router, toast]);

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
