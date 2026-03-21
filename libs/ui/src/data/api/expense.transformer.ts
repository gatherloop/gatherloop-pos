// eslint-disable-next-line @nx/enforce-module-boundaries
import { Expense as ApiExpense } from '../../../../api-contract/src';
import { Expense, ExpenseForm } from '../../domain';
import { toBudget } from './budget.transformer';
import { toWallet } from './wallet.transformer';

export function toExpense(expense: ApiExpense): Expense {
  return {
    id: expense.id,
    createdAt: expense.createdAt,
    budget: toBudget(expense.budget),
    expenseItems: expense.expenseItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      name: item.name,
      price: item.price,
      unit: item.unit,
    })),
    total: expense.total,
    wallet: toWallet(expense.wallet),
  };
}

export function toApiExpense(form: ExpenseForm) {
  return {
    walletId: form.walletId,
    budgetId: form.budgetId,
    expenseItems: form.expenseItems,
  };
}
