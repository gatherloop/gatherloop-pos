import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionCreate,
  transactionDeleteById,
  transactionFindById,
  TransactionFindById200,
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
  TransactionListParams,
  TransactionRepository,
  TransactionStatistic,
} from '../../domain';

export class ApiTransactionRepository implements TransactionRepository {
  client: QueryClient;

  transactionListServerParams: TransactionListParams = {
    page: 1,
    itemPerPage: 8,
    orderBy: 'desc',
    query: '',
    sortBy: 'created_at',
    paymentStatus: 'all',
  };

  transactionByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getTransactionListServerParams: TransactionRepository['getTransactionListServerParams'] =
    () => this.transactionListServerParams;

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

  fetchTransactionStatisticList: TransactionRepository['fetchTransactionStatisticList'] =
    (groupBy: 'date' | 'month') => {
      return this.client
        .fetchQuery({
          queryKey: transactionStatisticsQueryKey({ groupBy }),
          queryFn: () => transactionStatistics({ groupBy }),
        })
        .then((data) => data.data.map(transformers.transactionStatistic));
    };

  payTransaction: TransactionRepository['payTransaction'] = (
    transactionId,
    walletId
  ) => {
    return transactionPayById(transactionId, { walletId }).then();
  };

  getTransactionById: TransactionRepository['getTransactionById'] = (
    transactionId
  ) => {
    const res = this.client.getQueryState<TransactionFindById200>(
      transactionFindByIdQueryKey(transactionId)
    )?.data;

    this.client.removeQueries({
      queryKey: transactionFindByIdQueryKey(transactionId),
    });

    return res ? transformers.transaction(res.data) : null;
  };

  getTransactionByIdServerParams: TransactionRepository['getTransactionByIdServerParams'] =
    () => this.transactionByIdServerParams;

  fetchTransactionById: TransactionRepository['fetchTransactionById'] = (
    transactionId
  ) => {
    return this.client
      .fetchQuery({
        queryKey: transactionFindByIdQueryKey(transactionId),
        queryFn: () => transactionFindById(transactionId),
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
        productId: item.product.id,
        discountAmount: item.discountAmount,
      })),
    }).then();
  };

  updateTransaction: TransactionRepository['updateTransaction'] = (
    formValues,
    transactionId
  ) => {
    return transactionUpdateById(transactionId, {
      name: formValues.name,
      transactionItems: formValues.transactionItems.map((item) => ({
        amount: item.amount,
        productId: item.product.id,
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

  fetchTransactionList: TransactionRepository['fetchTransactionList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
    paymentStatus,
  }) => {
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
        queryFn: () => transactionList(params),
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
      product: {
        category: {
          id: item.product.category.id,
          createdAt: item.product.category.createdAt,
          name: item.product.category.name,
        },
        createdAt: item.product.createdAt,
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        materials: (item.product.materials ?? []).map((productMaterial) => ({
          materialId: productMaterial.materialId,
          amount: productMaterial.amount,
          material: {
            id: productMaterial.material.id,
            name: productMaterial.material.name,
            price: productMaterial.material.price,
            unit: productMaterial.material.unit,
            createdAt: productMaterial.material.createdAt,
          },
        })),
        description: item.product.description,
      },
    })),
    paidAt: transaction.paidAt,
    wallet: transaction.wallet
      ? {
          balance: transaction.wallet.balance,
          createdAt: transaction.wallet.createdAt,
          id: transaction.wallet.id,
          name: transaction.wallet.name,
          paymentCostPercentage: transaction.wallet.paymentCostPercentage,
        }
      : undefined,
  }),
};
