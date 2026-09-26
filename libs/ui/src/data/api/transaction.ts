import axios from 'axios';
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
  transactionCompleteById,
  transactionUncompleteById,
  getTransactionVerification,
  approveTransactionVerification as apiApproveTransactionVerification,
  rejectTransactionVerification as apiRejectTransactionVerification,
} from '../../../../api-contract/src';
import {
  Transaction,
  TransactionRepository,
  TransactionStatistic,
  TransactionVerificationNotFoundError,
} from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import {
  toApiTransaction,
  toTransaction,
  toTransactionStatistic,
  toTransactionVerification,
} from './transaction.transformer';

export class ApiTransactionRepository implements TransactionRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getTransactionStatisticList: TransactionRepository['getTransactionStatisticList'] =
    ({ groupBy, startDate, endDate }) => {
      const params = {
        groupBy,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      };
      const res = this.client.getQueryState<TransactionStatistics200>(
        transactionStatisticsQueryKey(params)
      )?.data;

      this.client.removeQueries({
        queryKey: transactionStatisticsQueryKey(params),
      });

      return res?.data.map(toTransactionStatistic) ?? [];
    };

  fetchTransactionStatisticList = (
    {
      groupBy,
      startDate,
      endDate,
    }: { groupBy: 'date' | 'month'; startDate: string | null; endDate: string | null },
    options?: Partial<RequestConfig>
  ) => {
    const params = {
      groupBy,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    };
    return this.client
      .fetchQuery({
        queryKey: transactionStatisticsQueryKey(params),
        queryFn: () => transactionStatistics(params, options),
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

  completeTransaction: TransactionRepository['completeTransaction'] = (
    transactionId
  ) => {
    return transactionCompleteById(transactionId).then();
  };

  uncompleteTransaction: TransactionRepository['uncompleteTransaction'] = (
    transactionId
  ) => {
    return transactionUncompleteById(transactionId).then();
  };

  fetchTransactionVerification: TransactionRepository['fetchTransactionVerification'] =
    (transactionId) => {
      return getTransactionVerification(transactionId)
        .then(({ data }) => toTransactionVerification(data))
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw new TransactionVerificationNotFoundError();
          }
          throw error;
        });
    };

  approveTransactionVerification: TransactionRepository['approveTransactionVerification'] =
    (transactionId) => {
      return apiApproveTransactionVerification(transactionId).then();
    };

  rejectTransactionVerification: TransactionRepository['rejectTransactionVerification'] =
    (transactionId) => {
      return apiRejectTransactionVerification(transactionId).then();
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
      pagerNumber: body.pagerNumber,
      diningOption: body.diningOption,
      transactionItems: body.transactionItems.map((item) => ({
        amount: item.amount,
        variantId: item.variantId,
        discountAmount: item.discountAmount,
        note: item.note,
      })),
      transactionCoupons: body.transactionCoupons,
    }).then(({ data }) => ({
      transactionId: data.id,
      transactionNumber: data.transactionNumber,
    }));
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
    source,
    fulfillment,
  }) => {
    const params: TransactionListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      paymentStatus,
      walletId: walletId ?? undefined,
      source,
      fulfillment,
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
      source,
      fulfillment,
    }: {
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      page: number;
      query: string;
      sortBy: 'created_at';
      paymentStatus: 'all' | 'paid' | 'unpaid';
      walletId: number | null;
      source: 'all' | 'pos' | 'order';
      fulfillment: 'all' | 'preparing' | 'ready';
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
      source,
      fulfillment,
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
