import {
  ApiAuthRepository,
  ApiChecklistSessionRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistSessionCreateParams,
  ChecklistSessionCreateUsecase,
  ChecklistSessionListParams,
  ChecklistSessionListUsecase,
  ChecklistTemplate,
} from '../domain';
import { ChecklistSessionListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ChecklistSessionListProps = {
  checklistSessionListParams: ChecklistSessionListParams;
  checklistSessionCreateParams: ChecklistSessionCreateParams;
  checklistTemplates: ChecklistTemplate[];
};

export function ChecklistSessionList({
  checklistSessionListParams,
  checklistSessionCreateParams,
  checklistTemplates,
}: ChecklistSessionListProps) {
  const client = new QueryClient();
  const checklistSessionRepository = new ApiChecklistSessionRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistSessionListUsecase = new ChecklistSessionListUsecase(
    checklistSessionRepository,
    checklistSessionListParams
  );
  const checklistSessionCreateUsecase = new ChecklistSessionCreateUsecase(
    checklistSessionRepository,
    checklistSessionCreateParams
  );

  return (
    <ChecklistSessionListHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistSessionListUsecase={checklistSessionListUsecase}
      checklistSessionCreateUsecase={checklistSessionCreateUsecase}
      checklistTemplates={checklistTemplates}
    />
  );
}
