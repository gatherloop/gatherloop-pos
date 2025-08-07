import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionCreate,
  transactionDeleteById,
  transactionFindById,
  transactionFindByIdQueryKey,
  transactionList,
  TransactionList200,
  transactionListQueryKey,
  transactionUpdateById,
  Transaction as ApiTransaction,
  transactionPayById,
  transactionStatisticsQueryKey,
  transactionStatistics,
  TransactionStatistic as ApiTransactionStatistic,
  TransactionStatistics200,
  TransactionListQueryParams,
} from '../../../../api-contract/src';
import {
  Transaction,
  TransactionRepository,
  TransactionStatistic,
} from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiTransactionRepository implements TransactionRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getTransactionStatisticList: TransactionRepository['getTransactionStatisticList'] =
    (groupBy: 'date' | 'month') => {
      const res = this.client.getQueryState<TransactionStatistics200>(
        transactionStatisticsQueryKey({ groupBy })
      )?.data;

      this.client.removeQueries({
        queryKey: transactionStatisticsQueryKey({ groupBy }),
      });

      return res?.data.map(transformers.transactionStatistic) ?? [];
    };

  fetchTransactionStatisticList = (
    groupBy: 'date' | 'month',
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: transactionStatisticsQueryKey({ groupBy }),
        queryFn: () => transactionStatistics({ groupBy }, options),
      })
      .then((data) => data.data.map(transformers.transactionStatistic));
  };

  payTransaction: TransactionRepository['payTransaction'] = (
    transactionId,
    walletId,
    paidAmount
  ) => {
    return transactionPayById(transactionId, { walletId, paidAmount }).then();
  };

  fetchTransactionById = (
    transactionId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: transactionFindByIdQueryKey(transactionId),
        queryFn: () => transactionFindById(transactionId, options),
      })
      .then(({ data }) => transformers.transaction(data));
  };

  createTransaction: TransactionRepository['createTransaction'] = (
    formValues
  ) => {
    return transactionCreate({
      name: formValues.name,
      transactionItems: formValues.transactionItems.map((item) => ({
        amount: item.amount,
        variantId: item.variant.id,
        discountAmount: item.discountAmount,
      })),
    }).then(({ data }) => ({ transactionId: data.id }));
  };

  updateTransaction: TransactionRepository['updateTransaction'] = (
    formValues,
    transactionId
  ) => {
    return transactionUpdateById(transactionId, {
      name: formValues.name,
      transactionItems: formValues.transactionItems.map((item) => ({
        id: item.id,
        amount: item.amount,
        variantId: item.variant.id,
        discountAmount: item.discountAmount,
      })),
    }).then();
  };

  deleteTransactionById: TransactionRepository['deleteTransactionById'] = (
    transactionId
  ) => {
    return transactionDeleteById(transactionId).then();
  };

  getTransactionList: TransactionRepository['getTransactionList'] = ({
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
    const res = this.client.getQueryState<TransactionList200>(
      transactionListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: transactionListQueryKey(params) });

    return {
      transactions: res?.data.map(transformers.transaction) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchTransactionList = (
    {
      itemPerPage,
      orderBy,
      page,
      query,
      sortBy,
      paymentStatus,
    }: {
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      page: number;
      query: string;
      sortBy: 'created_at';
      paymentStatus: 'all' | 'paid' | 'unpaid';
    },
    options?: Partial<RequestConfig>
  ) => {
    const params: TransactionListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      paymentStatus,
    };
    return this.client
      .fetchQuery({
        queryKey: transactionListQueryKey(params),
        queryFn: () => transactionList(params, options),
      })
      .then((data) => {
        return {
          transactions: data.data.map(transformers.transaction),
          totalItem: data.meta.total,
        };
      });
  };
}

const transformers = {
  transactionStatistic: (
    transactionStatistic: ApiTransactionStatistic
  ): TransactionStatistic => ({
    date: transactionStatistic.date,
    total: transactionStatistic.total,
    totalIncome: transactionStatistic.totalIncome,
  }),
  transaction: (transaction: ApiTransaction): Transaction => ({
    id: transaction.id,
    createdAt: transaction.createdAt,
    name: transaction.name,
    total: transaction.total,
    totalIncome: transaction.totalIncome,
    transactionItems: transaction.transactionItems.map((item) => ({
      amount: item.amount,
      id: item.id,
      price: item.price,
      discountAmount: item.discountAmount,
      subtotal: item.subtotal,
      variant: {
        createdAt: item.variant.createdAt,
        id: item.variant.id,
        name: item.variant.name,
        price: item.variant.price,
        materials: (item.variant.materials ?? []).map((variantMaterial) => ({
          id: variantMaterial.id,
          materialId: variantMaterial.materialId,
          amount: variantMaterial.amount,
          material: {
            id: variantMaterial.material.id,
            name: variantMaterial.material.name,
            price: variantMaterial.material.price,
            unit: variantMaterial.material.unit,
            createdAt: variantMaterial.material.createdAt,
          },
        })),
        description: item.variant.description ?? '',
        product: {
          category: item.variant.product.category,
          createdAt: item.variant.product.createdAt,
          id: item.variant.product.id,
          name: item.variant.product.name,
          description: item.variant.product.description ?? '',
          options: item.variant.product.options,
        },
        values: item.variant.values.map((value) => ({
          id: value.id,
          variantId: value.variantId,
          optionValueId: value.optionValueId,
          optionValue: {
            id: value.optionValue.id,
            name: value.optionValue.name,
          },
        })),
      },
    })),
    paidAt: transaction.paidAt ?? null,
    wallet: transaction.wallet
      ? {
          balance: transaction.wallet.balance,
          createdAt: transaction.wallet.createdAt,
          id: transaction.wallet.id,
          name: transaction.wallet.name,
          paymentCostPercentage: transaction.wallet.paymentCostPercentage,
          isCashless: transaction.wallet.isCashless,
        }
      : null,
    paidAmount: transaction.paidAmount,
  }),
};
