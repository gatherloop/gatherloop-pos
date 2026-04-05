import {
  ApiAuthRepository,
  ApiChecklistTemplateRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ChecklistTemplateDeleteUsecase,
  ChecklistTemplateListUsecase,
} from '../domain';
import { ChecklistTemplateListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';
import { ChecklistTemplateListParams } from '../domain/usecases/checklistTemplateList';

export type ChecklistTemplateListProps = {
  checklistTemplateListParams: ChecklistTemplateListParams;
};

export function ChecklistTemplateList({
  checklistTemplateListParams,
}: ChecklistTemplateListProps) {
  const client = new QueryClient();
  const checklistTemplateRepository = new ApiChecklistTemplateRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const checklistTemplateListUsecase = new ChecklistTemplateListUsecase(
    checklistTemplateRepository,
    checklistTemplateListParams
  );
  const checklistTemplateDeleteUsecase = new ChecklistTemplateDeleteUsecase(
    checklistTemplateRepository
  );

  return (
    <ChecklistTemplateListHandler
      authLogoutUsecase={authLogoutUsecase}
      checklistTemplateListUsecase={checklistTemplateListUsecase}
      checklistTemplateDeleteUsecase={checklistTemplateDeleteUsecase}
    />
  );
}
