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

  fetchExpenseList = (options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: expenseListQueryKey({ sortBy: 'created_at', order: 'desc' }),
        queryFn: () =>
          expenseList({ sortBy: 'created_at', order: 'desc' }, options),
      })
      .then((data) => data.data.map(transformers.expense));
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
    },
  }),
};
