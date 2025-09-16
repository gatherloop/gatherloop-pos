import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionCategoryCreate,
  transactionCategoryDeleteById,
  transactionCategoryFindById,
  transactionCategoryFindByIdQueryKey,
  transactionCategoryList,
  transactionCategoryListQueryKey,
  transactionCategoryUpdateById,
  TransactionCategory as ApiTransactionCategory,
} from '../../../../api-contract/src';
import {
  TransactionCategory,
  TransactionCategoryRepository,
} from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { productTransformers } from './product';

export class ApiTransactionCategoryRepository
  implements TransactionCategoryRepository
{
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchTransactionCategoryById = (
    transactionCategoryId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: transactionCategoryFindByIdQueryKey(transactionCategoryId),
        queryFn: () =>
          transactionCategoryFindById(transactionCategoryId, options),
      })
      .then(({ data }) => transformers.transactionCategory(data));
  };

  createTransactionCategory: TransactionCategoryRepository['createTransactionCategory'] =
    (formValues) => {
      return transactionCategoryCreate({
        name: formValues.name,
        checkoutProductId: formValues.checkoutProductId ?? undefined,
      }).then();
    };

  updateTransactionCategory: TransactionCategoryRepository['updateTransactionCategory'] =
    (formValues, transactionCategoryId) => {
      return transactionCategoryUpdateById(transactionCategoryId, {
        name: formValues.name,
        checkoutProductId: formValues.checkoutProductId ?? undefined,
      }).then();
    };

  deleteTransactionCategoryById: TransactionCategoryRepository['deleteTransactionCategoryById'] =
    (transactionCategoryId) => {
      return transactionCategoryDeleteById(transactionCategoryId).then();
    };

  fetchTransactionCategoryList = (
    options?: Partial<RequestConfig>
  ): Promise<TransactionCategory[]> => {
    return this.client
      .fetchQuery({
        queryKey: transactionCategoryListQueryKey(),
        queryFn: () => transactionCategoryList(options),
      })
      .then((data) => data.data.map(transformers.transactionCategory));
  };
}

const transformers = {
  transactionCategory: (
    transactionCategory: ApiTransactionCategory
  ): TransactionCategory => ({
    id: transactionCategory.id,
    createdAt: transactionCategory.createdAt,
    checkoutProduct: transactionCategory.checkoutProduct
      ? productTransformers.product(transactionCategory.checkoutProduct)
      : null,
    checkoutProductId: transactionCategory.checkoutProductId ?? null,
    name: transactionCategory.name,
  }),
};
