import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  variantCreate,
  variantDeleteById,
  variantFindById,
  variantFindByIdQueryKey,
  variantList,
  VariantList200,
  variantListQueryKey,
  variantUpdateById,
} from '../../../../api-contract/src';
import { Variant, VariantRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiVariant, toVariant } from './variant.transformer';

export class ApiVariantRepository implements VariantRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchVariantById = (
    variantId: number,
    options?: Partial<RequestConfig>
  ): Promise<Variant> => {
    return this.client
      .fetchQuery({
        queryKey: variantFindByIdQueryKey(variantId),
        queryFn: () => variantFindById(variantId, options),
      })
      .then(({ data }) => toVariant(data));
  };

  createVariant: VariantRepository['createVariant'] = (formValues) => {
    return variantCreate(toApiVariant(formValues)).then();
  };

  updateVariant: VariantRepository['updateVariant'] = (
    formValues,
    variantId
  ) => {
    return variantUpdateById(variantId, toApiVariant(formValues)).then();
  };

  deleteVariantById: VariantRepository['deleteVariantById'] = (variantId) => {
    return variantDeleteById(variantId).then();
  };

  getVariantList: VariantRepository['getVariantList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
    optionValueIds,
    productId,
  }) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      optionValueIds,
      productId,
    };

    const res = this.client.getQueryState<VariantList200>(
      variantListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: variantListQueryKey(params) });

    return {
      variants: res?.data.map(toVariant) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchVariantList = (
    params: {
      query: string;
      page: number;
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      sortBy: 'created_at';
      productId?: number;
      optionValueIds: number[];
    },
    options?: Partial<RequestConfig>
  ) => {
    const queryParams = {
      query: params.query,
      skip: (params.page - 1) * params.itemPerPage,
      limit: params.itemPerPage,
      order: params.orderBy,
      sortBy: params.sortBy,
      productId: params.productId,
      optionValueIds: params.optionValueIds,
    };

    return this.client
      .fetchQuery({
        queryKey: variantListQueryKey(queryParams),
        queryFn: () => variantList(queryParams, options),
      })
      .then((data) => ({
        variants: data.data.map(toVariant),
        totalItem: data.meta.total,
      }));
  };
}
