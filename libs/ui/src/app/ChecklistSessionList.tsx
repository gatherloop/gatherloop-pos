import {
  ApiAuthRepository,
  ApiChecklistSessionRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistSessionListParams,
  ChecklistSessionListUsecase,
} from '../domain';
import { ChecklistSessionListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ChecklistSessionListProps = {
  checklistSessionListParams: ChecklistSessionListParams;
};

export function ChecklistSessionList({
  checklistSessionListParams,
}: ChecklistSessionListProps) {
  const client = new QueryClient();
  const checklistSessionRepository = new ApiChecklistSessionRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistSessionListUsecase = new ChecklistSessionListUsecase(
    checklistSessionRepository,
    checklistSessionListParams
  );

  return (
    <ChecklistSessionListHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistSessionListUsecase={checklistSessionListUsecase}
    />
  );
}
