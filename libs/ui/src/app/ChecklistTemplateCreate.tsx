import {
  ApiAuthRepository,
  ApiChecklistTemplateRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistTemplateCreateUsecase,
} from '../domain';
import { ChecklistTemplateCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function ChecklistTemplateCreate() {
  const client = new QueryClient();
  const checklistTemplateRepository = new ApiChecklistTemplateRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistTemplateCreateUsecase = new ChecklistTemplateCreateUsecase(
    checklistTemplateRepository
  );

  return (
    <ChecklistTemplateCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistTemplateCreateUsecase={checklistTemplateCreateUsecase}
    />
  );
}
