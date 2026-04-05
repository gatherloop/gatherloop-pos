import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  checklistSessionCreate,
  checklistSessionDeleteById,
  checklistSessionFindById,
  checklistSessionFindByIdQueryKey,
  checklistSessionItemCheck,
  checklistSessionItemUncheck,
  checklistSessionSubItemCheck,
  checklistSessionSubItemUncheck,
} from '../../../../api-contract/src';
import {
  ChecklistSession,
  ChecklistSessionItem,
  ChecklistSessionRepository,
  ChecklistSessionSubItem,
} from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import {
  toApiChecklistSession,
  toChecklistSession,
  toChecklistSessionItem,
  toChecklistSessionSubItem,
} from './checklistSession.transformer';
import { ChecklistSessionForm } from '../../domain/entities/ChecklistSession';

export class ApiChecklistSessionRepository
  implements ChecklistSessionRepository
{
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchChecklistSessionById = (
    checklistSessionId: number,
    options?: Partial<RequestConfig>
  ): Promise<ChecklistSession> => {
    return this.client
      .fetchQuery({
        queryKey: checklistSessionFindByIdQueryKey(checklistSessionId),
        queryFn: () =>
          checklistSessionFindById(checklistSessionId, options),
      })
      .then(({ data }) => toChecklistSession(data));
  };

  createChecklistSession: ChecklistSessionRepository['createChecklistSession'] =
    (formValues: ChecklistSessionForm): Promise<ChecklistSession> => {
      return checklistSessionCreate(
        toApiChecklistSession(formValues)
      ).then(({ data }) => toChecklistSession(data));
    };

  deleteChecklistSessionById: ChecklistSessionRepository['deleteChecklistSessionById'] =
    (checklistSessionId: number): Promise<void> => {
      return checklistSessionDeleteById(checklistSessionId).then();
    };

  checkChecklistSessionItem: ChecklistSessionRepository['checkChecklistSessionItem'] =
    (checklistSessionItemId: number): Promise<ChecklistSessionItem> => {
      return checklistSessionItemCheck(checklistSessionItemId).then(
        ({ data }) => toChecklistSessionItem(data)
      );
    };

  uncheckChecklistSessionItem: ChecklistSessionRepository['uncheckChecklistSessionItem'] =
    (checklistSessionItemId: number): Promise<ChecklistSessionItem> => {
      return checklistSessionItemUncheck(checklistSessionItemId).then(
        ({ data }) => toChecklistSessionItem(data)
      );
    };

  checkChecklistSessionSubItem: ChecklistSessionRepository['checkChecklistSessionSubItem'] =
    (checklistSessionSubItemId: number): Promise<ChecklistSessionSubItem> => {
      return checklistSessionSubItemCheck(checklistSessionSubItemId).then(
        ({ data }) => toChecklistSessionSubItem(data)
      );
    };

  uncheckChecklistSessionSubItem: ChecklistSessionRepository['uncheckChecklistSessionSubItem'] =
    (checklistSessionSubItemId: number): Promise<ChecklistSessionSubItem> => {
      return checklistSessionSubItemUncheck(checklistSessionSubItemId).then(
        ({ data }) => toChecklistSessionSubItem(data)
      );
    };
}
