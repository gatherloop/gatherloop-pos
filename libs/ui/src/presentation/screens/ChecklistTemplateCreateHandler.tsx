import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ChecklistTemplateCreateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useChecklistTemplateCreateController,
} from '../controllers';
import { ChecklistTemplateCreateScreen } from './ChecklistTemplateCreateScreen';

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
      form={checklistTemplateCreate.form}
      onSubmit={(values) =>
        checklistTemplateCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        checklistTemplateCreate.state.type === 'submitting' ||
        checklistTemplateCreate.state.type === 'submitError' ||
        checklistTemplateCreate.state.type === 'submitSuccess'
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
