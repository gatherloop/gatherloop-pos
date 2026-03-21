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
  transactionPayById,
  transactionStatisticsQueryKey,
  transactionStatistics,
  TransactionStatistics200,
  TransactionListQueryParams,
  transactionUnpayById,
} from '../../../../api-contract/src';
import {
  Transaction,
  TransactionRepository,
  TransactionStatistic,
} from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiTransaction, toTransaction, toTransactionStatistic } from './transaction.transformer';

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

      return res?.data.map(toTransactionStatistic) ?? [];
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
      .then((data) => data.data.map(toTransactionStatistic));
  };

  payTransaction: TransactionRepository['payTransaction'] = (
    transactionId,
    walletId,
    paidAmount
  ) => {
    return transactionPayById(transactionId, { walletId, paidAmount }).then();
  };

  unpayTransaction: TransactionRepository['unpayTransaction'] = (
    transactionId
  ) => {
    return transactionUnpayById(transactionId).then();
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
      .then(({ data }) => toTransaction(data));
  };

  createTransaction: TransactionRepository['createTransaction'] = (
    formValues
  ) => {
    const body = toApiTransaction(formValues);
    return transactionCreate({
      name: body.name,
      orderNumber: body.orderNumber,
      transactionItems: body.transactionItems.map((item) => ({
        amount: item.amount,
        variantId: item.variantId,
        discountAmount: item.discountAmount,
        note: item.note,
      })),
      transactionCoupons: body.transactionCoupons,
    }).then(({ data }) => ({ transactionId: data.id }));
  };

  updateTransaction: TransactionRepository['updateTransaction'] = (
    formValues,
    transactionId
  ) => {
    return transactionUpdateById(transactionId, toApiTransaction(formValues)).then();
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
    paymentStatus,
    walletId,
  }) => {
    const params: TransactionListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      paymentStatus,
      walletId: walletId ?? undefined,
    };
    const res = this.client.getQueryState<TransactionList200>(
      transactionListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: transactionListQueryKey(params) });

    return {
      transactions: res?.data.map(toTransaction) ?? [],
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
      walletId,
    }: {
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      page: number;
      query: string;
      sortBy: 'created_at';
      paymentStatus: 'all' | 'paid' | 'unpaid';
      walletId: number | null;
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
      walletId: walletId ?? undefined,
    };
    return this.client
      .fetchQuery({
        queryKey: transactionListQueryKey(params),
        queryFn: () => transactionList(params, options),
      })
      .then((data) => {
        return {
          transactions: data.data.map(toTransaction),
          totalItem: data.meta.total,
        };
      });
  };
}
