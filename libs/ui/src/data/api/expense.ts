import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  expenseCreate,
  expenseDeleteById,
  expenseFindById,
  ExpenseFindById200,
  expenseFindByIdQueryKey,
  expenseList,
  ExpenseList200,
  expenseListQueryKey,
  expenseUpdateById,
  Expense as ApiExpense,
} from '../../../../api-contract/src';
import { Expense, ExpenseRepository } from '../../domain';

export class ApiExpenseRepository implements ExpenseRepository {
  client: QueryClient;

  expenseByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getExpenseById: ExpenseRepository['getExpenseById'] = (expenseId) => {
    const res = this.client.getQueryState<ExpenseFindById200>(
      expenseFindByIdQueryKey(expenseId)
    )?.data;

    this.client.removeQueries({ queryKey: expenseFindByIdQueryKey(expenseId) });

    return res ? transformers.expense(res.data) : null;
  };

  getExpenseByIdServerParams: ExpenseRepository['getExpenseByIdServerParams'] =
    () => this.expenseByIdServerParams;

  fetchExpenseById: ExpenseRepository['fetchExpenseById'] = (expenseId) => {
    return this.client
      .fetchQuery({
        queryKey: expenseFindByIdQueryKey(expenseId),
        queryFn: () => expenseFindById(expenseId),
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

  getExpenseList: ExpenseRepository['getExpenseList'] = () => {
    const res = this.client.getQueryState<ExpenseList200>(
      expenseListQueryKey({ sortBy: 'created_at', order: 'desc' })
    )?.data;

    this.client.removeQueries({
      queryKey: expenseListQueryKey({ sortBy: 'created_at', order: 'desc' }),
    });

    return res?.data.map(transformers.expense) ?? [];
  };

  fetchExpenseList: ExpenseRepository['fetchExpenseList'] = () => {
    return this.client
      .fetchQuery({
        queryKey: expenseListQueryKey({ sortBy: 'created_at', order: 'desc' }),
        queryFn: () => expenseList({ sortBy: 'created_at', order: 'desc' }),
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
