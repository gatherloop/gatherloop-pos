import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  checklistTemplateCreate,
  checklistTemplateDeleteById,
  checklistTemplateFindById,
  checklistTemplateFindByIdQueryKey,
  checklistTemplateList,
  ChecklistTemplateList200,
  checklistTemplateListQueryKey,
  checklistTemplateUpdateById,
} from '../../../../api-contract/src';
import { ChecklistTemplate, ChecklistTemplateRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import {
  toApiChecklistTemplate,
  toChecklistTemplate,
} from './checklistTemplate.transformer';

export class ApiChecklistTemplateRepository
  implements ChecklistTemplateRepository
{
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchChecklistTemplateById = (
    checklistTemplateId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: checklistTemplateFindByIdQueryKey(checklistTemplateId),
        queryFn: () =>
          checklistTemplateFindById(checklistTemplateId, options),
      })
      .then(({ data }) => toChecklistTemplate(data));
  };

  createChecklistTemplate: ChecklistTemplateRepository['createChecklistTemplate'] =
    (formValues) => {
      return checklistTemplateCreate(
        toApiChecklistTemplate(formValues)
      ).then();
    };

  updateChecklistTemplate: ChecklistTemplateRepository['updateChecklistTemplate'] =
    (formValues, checklistTemplateId) => {
      return checklistTemplateUpdateById(
        checklistTemplateId,
        toApiChecklistTemplate(formValues)
      ).then();
    };

  deleteChecklistTemplateById: ChecklistTemplateRepository['deleteChecklistTemplateById'] =
    (checklistTemplateId) => {
      return checklistTemplateDeleteById(checklistTemplateId).then();
    };

  getChecklistTemplateList: ChecklistTemplateRepository['getChecklistTemplateList'] =
    ({ itemPerPage, orderBy, page, query, sortBy }) => {
      const params = {
        query,
        skip: (page - 1) * itemPerPage,
        limit: itemPerPage,
        order: orderBy,
        sortBy,
      };

      const res = this.client.getQueryState<ChecklistTemplateList200>(
        checklistTemplateListQueryKey(params)
      )?.data;

      this.client.removeQueries({
        queryKey: checklistTemplateListQueryKey(params),
      });

      return {
        checklistTemplates: res?.data.map(toChecklistTemplate) ?? [],
        totalItem: res?.meta.total ?? 0,
      };
    };

  fetchChecklistTemplateList = (
    {
      itemPerPage,
      orderBy,
      page,
      query,
      sortBy,
    }: {
      page: number;
      itemPerPage: number;
      query: string;
      sortBy: 'created_at';
      orderBy: 'asc' | 'desc';
    },
    options?: Partial<RequestConfig>
  ) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    return this.client
      .fetchQuery({
        queryKey: checklistTemplateListQueryKey(params),
        queryFn: () => checklistTemplateList(params, options),
      })
      .then((data) => ({
        checklistTemplates: data.data.map(toChecklistTemplate),
        totalItem: data.meta.total,
      }));
  };
}
