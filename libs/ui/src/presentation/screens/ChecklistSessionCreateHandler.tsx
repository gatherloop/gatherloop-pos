import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ChecklistSessionCreateUsecase,
  ChecklistTemplate,
} from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useChecklistSessionCreateController,
} from '../controllers';
import { ChecklistSessionCreateScreen } from './ChecklistSessionCreateScreen';

export type ChecklistSessionCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistSessionCreateUsecase: ChecklistSessionCreateUsecase;
  checklistTemplates: ChecklistTemplate[];
};

export const ChecklistSessionCreateHandler = ({
  authLogoutUsecase,
  checklistSessionCreateUsecase,
  checklistTemplates,
}: ChecklistSessionCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
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
    <ChecklistSessionCreateScreen
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
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      checklistTemplates={checklistTemplates}
    />
  );
};
