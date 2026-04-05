import {
  ApiAuthRepository,
  ApiChecklistSessionRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistSessionCreateParams,
  ChecklistSessionCreateUsecase,
  ChecklistTemplate,
} from '../domain';
import { ChecklistSessionCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ChecklistSessionCreateProps = {
  checklistSessionCreateParams: ChecklistSessionCreateParams;
  checklistTemplates: ChecklistTemplate[];
};

export function ChecklistSessionCreate({
  checklistSessionCreateParams,
  checklistTemplates,
}: ChecklistSessionCreateProps) {
  const client = new QueryClient();
  const checklistSessionRepository = new ApiChecklistSessionRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistSessionCreateUsecase = new ChecklistSessionCreateUsecase(
    checklistSessionRepository,
    checklistSessionCreateParams
  );

  return (
    <ChecklistSessionCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistSessionCreateUsecase={checklistSessionCreateUsecase}
      checklistTemplates={checklistTemplates}
    />
  );
}
