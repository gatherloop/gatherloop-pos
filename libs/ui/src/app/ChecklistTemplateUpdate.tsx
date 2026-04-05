import {
  ApiAuthRepository,
  ApiChecklistTemplateRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistTemplateUpdateParams,
  ChecklistTemplateUpdateUsecase,
} from '../domain';
import { ChecklistTemplateUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type ChecklistTemplateUpdateProps = {
  checklistTemplateUpdateParams: ChecklistTemplateUpdateParams;
};

export function ChecklistTemplateUpdate({
  checklistTemplateUpdateParams,
}: ChecklistTemplateUpdateProps) {
  const client = new QueryClient();
  const checklistTemplateRepository = new ApiChecklistTemplateRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistTemplateUpdateUsecase = new ChecklistTemplateUpdateUsecase(
    checklistTemplateRepository,
    checklistTemplateUpdateParams
  );

  return (
    <ChecklistTemplateUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistTemplateUpdateUsecase={checklistTemplateUpdateUsecase}
    />
  );
}
