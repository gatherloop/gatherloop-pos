import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  supplierCreate,
  supplierDeleteById,
  supplierFindById,
  supplierFindByIdQueryKey,
  supplierList,
  SupplierList200,
  supplierListQueryKey,
  supplierUpdateById,
} from '../../../../api-contract/src';
import { Supplier, SupplierRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiSupplier, toSupplier } from './supplier.transformer';

export class ApiSupplierRepository implements SupplierRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchSupplierById = (
    supplierId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: supplierFindByIdQueryKey(supplierId),
        queryFn: () => supplierFindById(supplierId, options),
      })
      .then(({ data }) => toSupplier(data));
  };

  createSupplier: SupplierRepository['createSupplier'] = (formValues) => {
    return supplierCreate(toApiSupplier(formValues)).then();
  };

  updateSupplier: SupplierRepository['updateSupplier'] = (
    formValues,
    supplierId
  ) => {
    return supplierUpdateById(supplierId, toApiSupplier(formValues)).then();
  };

  deleteSupplierById: SupplierRepository['deleteSupplierById'] = (
    supplierId
  ) => {
    return supplierDeleteById(supplierId).then();
  };

  getSupplierList: SupplierRepository['getSupplierList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
  }) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    const res = this.client.getQueryState<SupplierList200>(
      supplierListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: supplierListQueryKey(params) });

    return {
      suppliers: res?.data.map(toSupplier) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchSupplierList = (
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
        queryKey: supplierListQueryKey(params),
        queryFn: () => supplierList(params, options),
      })
      .then((data) => ({
        suppliers: data.data.map(toSupplier),
        totalItem: data.meta.total,
      }));
  };
}
