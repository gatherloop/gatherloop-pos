import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  stockCheckCreate,
  stockCheckDeleteById,
  stockCheckFindById,
  stockCheckFindByIdQueryKey,
  stockCheckList,
  StockCheckList200,
  stockCheckListQueryKey,
  stockCheckUpdateById,
} from '../../../../api-contract/src';
import { StockCheck, StockCheckRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toStockCheck, toApiStockCheckRequest } from './stockCheck.transformer';

export class ApiStockCheckRepository implements StockCheckRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchStockCheckById = (
    stockCheckId: number,
    options?: Partial<RequestConfig>
  ): Promise<StockCheck> => {
    return this.client
      .fetchQuery({
        queryKey: stockCheckFindByIdQueryKey(stockCheckId),
        queryFn: () => stockCheckFindById(stockCheckId, options),
      })
      .then(({ data }) => toStockCheck(data));
  };

  createStockCheck: StockCheckRepository['createStockCheck'] = (form) => {
    return stockCheckCreate(toApiStockCheckRequest(form)).then();
  };

  updateStockCheck: StockCheckRepository['updateStockCheck'] = (
    form,
    stockCheckId
  ) => {
    return stockCheckUpdateById(
      stockCheckId,
      toApiStockCheckRequest(form)
    ).then();
  };

  deleteStockCheckById: StockCheckRepository['deleteStockCheckById'] = (
    stockCheckId
  ) => {
    return stockCheckDeleteById(stockCheckId).then();
  };

  getStockCheckList: StockCheckRepository['getStockCheckList'] = ({
    itemPerPage,
    orderBy,
    page,
    sortBy,
  }) => {
    const params = {
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    const res = this.client.getQueryState<StockCheckList200>(
      stockCheckListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: stockCheckListQueryKey(params) });

    return {
      stockChecks: res?.data.map(toStockCheck) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchStockCheckList = (
    {
      itemPerPage,
      orderBy,
      page,
      sortBy,
    }: {
      page: number;
      itemPerPage: number;
      sortBy: 'created_at';
      orderBy: 'asc' | 'desc';
    },
    options?: Partial<RequestConfig>
  ): Promise<{ stockChecks: StockCheck[]; totalItem: number }> => {
    const params = {
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    return this.client
      .fetchQuery({
        queryKey: stockCheckListQueryKey(params),
        queryFn: () => stockCheckList(params, options),
      })
      .then((data) => ({
        stockChecks: data.data.map(toStockCheck),
        totalItem: data.meta.total,
      }));
  };
}
