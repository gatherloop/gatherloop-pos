import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  checklistSessionCreate,
  checklistSessionDeleteById,
  checklistSessionFindById,
  checklistSessionFindByIdQueryKey,
  checklistSessionItemCheck,
  checklistSessionItemUncheck,
  checklistSessionList,
  checklistSessionListQueryKey,
  ChecklistSessionListQueryResponse,
  checklistSessionSubItemCheck,
  checklistSessionSubItemUncheck,
} from '../../../../api-contract/src';
import {
  ChecklistSession,
  ChecklistSessionItem,
  ChecklistSessionListFilter,
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

  getChecklistSessionList: ChecklistSessionRepository['getChecklistSessionList'] =
    ({ page, itemPerPage, filter }) => {
      const params = {
        skip: (page - 1) * itemPerPage,
        limit: itemPerPage,
        ...(filter.templateId != null && { templateId: filter.templateId }),
        ...(filter.dateFrom != null && { dateFrom: filter.dateFrom }),
        ...(filter.dateTo != null && { dateTo: filter.dateTo }),
        ...(filter.status != null && { status: filter.status }),
      };

      const res = this.client.getQueryState<ChecklistSessionListQueryResponse>(
        checklistSessionListQueryKey(params)
      )?.data;

      this.client.removeQueries({
        queryKey: checklistSessionListQueryKey(params),
      });

      return {
        checklistSessions: res?.data.map(toChecklistSession) ?? [],
        totalItem: res?.meta.total ?? 0,
      };
    };

  fetchChecklistSessionList = (
    {
      page,
      itemPerPage,
      filter,
    }: {
      page: number;
      itemPerPage: number;
      filter: ChecklistSessionListFilter;
    },
    options?: Partial<RequestConfig>
  ) => {
    const params = {
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      ...(filter.templateId != null && { templateId: filter.templateId }),
      ...(filter.dateFrom != null && { dateFrom: filter.dateFrom }),
      ...(filter.dateTo != null && { dateTo: filter.dateTo }),
      ...(filter.status != null && { status: filter.status }),
    };

    return this.client
      .fetchQuery({
        queryKey: checklistSessionListQueryKey(params),
        queryFn: () => checklistSessionList(params, options),
      })
      .then((data) => ({
        checklistSessions: data.data.map(toChecklistSession),
        totalItem: data.meta.total,
      }));
  };

  fetchChecklistSessionById = (
    checklistSessionId: number,
    options?: Partial<RequestConfig>
  ): Promise<ChecklistSession> => {
    return this.client
      .fetchQuery({
        queryKey: checklistSessionFindByIdQueryKey(checklistSessionId),
        queryFn: () => checklistSessionFindById(checklistSessionId, options),
      })
      .then(({ data }) => toChecklistSession(data));
  };

  createChecklistSession: ChecklistSessionRepository['createChecklistSession'] =
    (formValues: ChecklistSessionForm): Promise<ChecklistSession> => {
      return checklistSessionCreate(toApiChecklistSession(formValues)).then(
        ({ data }) => toChecklistSession(data)
      );
    };

  deleteChecklistSessionById: ChecklistSessionRepository['deleteChecklistSessionById'] =
    (checklistSessionId: number): Promise<void> => {
      return checklistSessionDeleteById(checklistSessionId).then();
    };

  checkChecklistSessionItem: ChecklistSessionRepository['checkChecklistSessionItem'] =
    (checklistSessionItemId: number): Promise<void> => {
      return checklistSessionItemCheck(checklistSessionItemId).then();
    };

  uncheckChecklistSessionItem: ChecklistSessionRepository['uncheckChecklistSessionItem'] =
    (checklistSessionItemId: number): Promise<void> => {
      return checklistSessionItemUncheck(checklistSessionItemId).then();
    };

  checkChecklistSessionSubItem: ChecklistSessionRepository['checkChecklistSessionSubItem'] =
    (checklistSessionSubItemId: number): Promise<void> => {
      return checklistSessionSubItemCheck(checklistSessionSubItemId).then();
    };

  uncheckChecklistSessionSubItem: ChecklistSessionRepository['uncheckChecklistSessionSubItem'] =
    (checklistSessionSubItemId: number): Promise<void> => {
      return checklistSessionSubItemUncheck(checklistSessionSubItemId).then();
    };
}
