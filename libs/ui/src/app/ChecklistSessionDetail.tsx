import {
  ApiAuthRepository,
  ApiChecklistSessionRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistSessionDeleteUsecase,
  ChecklistSessionDetailParams,
  ChecklistSessionDetailUsecase,
  ChecklistSessionItemToggleUsecase,
  ChecklistSessionSubItemToggleUsecase,
} from '../domain';
import { ChecklistSessionDetailHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ChecklistSessionDetailProps = {
  checklistSessionDetailParams: ChecklistSessionDetailParams;
};

export function ChecklistSessionDetail({
  checklistSessionDetailParams,
}: ChecklistSessionDetailProps) {
  const client = new QueryClient();
  const checklistSessionRepository = new ApiChecklistSessionRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistSessionDetailUsecase = new ChecklistSessionDetailUsecase(
    checklistSessionRepository,
    checklistSessionDetailParams
  );
  const checklistSessionDeleteUsecase = new ChecklistSessionDeleteUsecase(
    checklistSessionRepository
  );
  const checklistSessionItemToggleUsecase =
    new ChecklistSessionItemToggleUsecase(checklistSessionRepository);
  const checklistSessionSubItemToggleUsecase =
    new ChecklistSessionSubItemToggleUsecase(checklistSessionRepository);

  return (
    <ChecklistSessionDetailHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistSessionDetailUsecase={checklistSessionDetailUsecase}
      checklistSessionDeleteUsecase={checklistSessionDeleteUsecase}
      checklistSessionItemToggleUsecase={checklistSessionItemToggleUsecase}
      checklistSessionSubItemToggleUsecase={
        checklistSessionSubItemToggleUsecase
      }
    />
  );
}
