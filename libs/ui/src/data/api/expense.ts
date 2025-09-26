import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  expenseCreate,
  expenseDeleteById,
  expenseFindById,
  expenseFindByIdQueryKey,
  expenseList,
  expenseListQueryKey,
  expenseUpdateById,
  Expense as ApiExpense,
  ExpenseListQueryParams,
  ExpenseList200,
} from '../../../../api-contract/src';
import { Expense, ExpenseRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiExpenseRepository implements ExpenseRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchExpenseById = (expenseId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: expenseFindByIdQueryKey(expenseId),
        queryFn: () => expenseFindById(expenseId, options),
      })
      .then(({ data }) => transformers.expense(data));
  };

  createExpense: ExpenseRepository['createExpense'] = (formValues) => {
    return expenseCreate(formValues).then();
  };

  updateExpense: ExpenseRepository['updateExpense'] = (
    formValues,
    expenseId
  ) => {
    return expenseUpdateById(expenseId, formValues).then();
  };

  deleteExpenseById: ExpenseRepository['deleteExpenseById'] = (expenseId) => {
    return expenseDeleteById(expenseId).then();
  };

  fetchExpenseList = (
    {
      page,
      itemPerPage,
      query,
      sortBy,
      orderBy,
      walletId,
      budgetId,
    }: {
      page: number;
      itemPerPage: number;
      query: string;
      sortBy: 'created_at';
      orderBy: 'asc' | 'desc';
      walletId: number | null;
      budgetId: number | null;
    },
    options?: Partial<RequestConfig>
  ) => {
    const params: ExpenseListQueryParams = {
      query: query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy: sortBy,
      walletId: walletId ?? undefined,
      budgetId: budgetId ?? undefined,
    };
    return this.client
      .fetchQuery({
        queryKey: expenseListQueryKey(params),
        queryFn: () => expenseList(params, options),
      })
      .then((data) => ({
        expenses: data.data.map(transformers.expense),
        totalItem: data.meta.total,
      }));
  };

  getExpenseList: ExpenseRepository['getExpenseList'] = ({
    query,
    page,
    itemPerPage,
    orderBy,
    sortBy,
    walletId,
    budgetId,
  }) => {
    const params: ExpenseListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      walletId: walletId ?? undefined,
      budgetId: budgetId ?? undefined,
    };
    const res = this.client.getQueryState<ExpenseList200>(
      expenseListQueryKey(params)
    )?.data;
    this.client.removeQueries({ queryKey: expenseListQueryKey(params) });
    return {
      expenses: res?.data.map(transformers.expense) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };
}

const transformers = {
  expense: (expense: ApiExpense): Expense => ({
    id: expense.id,
    createdAt: expense.createdAt,
    budget: {
      balance: expense.budget.balance,
      createdAt: expense.budget.createdAt,
      id: expense.budget.id,
      name: expense.budget.name,
      percentage: expense.budget.percentage,
    },
    expenseItems: expense.expenseItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      name: item.name,
      price: item.price,
      unit: item.unit,
    })),
    total: expense.total,
    wallet: {
      balance: expense.wallet.balance,
      createdAt: expense.createdAt,
      id: expense.wallet.id,
      name: expense.wallet.name,
      paymentCostPercentage: expense.wallet.paymentCostPercentage,
      isCashless: expense.wallet.isCashless,
    },
  }),
};
