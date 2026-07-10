import { TransactionStatisticPreset } from './TransactionStatisticDateRange';

export type ExpenseStatistic = {
  date: string;
  budgetId: number;
  budgetName: string;
  total: number;
};

export type ExpenseStatisticView = 'budget' | 'combined';

export type ExpenseStatisticSeries = {
  budgetId: number;
  budgetName: string;
  points: { date: string; total: number }[];
};

export const DEFAULT_EXPENSE_STATISTIC_VIEW: ExpenseStatisticView = 'budget';
export const DEFAULT_EXPENSE_STATISTIC_GROUP_BY: 'date' | 'month' = 'month';
export const DEFAULT_EXPENSE_STATISTIC_PRESET: TransactionStatisticPreset =
  'last12Months';

/**
 * Rows arrive from the API pre-sorted chronologically
 * (`ORDER BY MIN(created_at) ASC, budget name ASC`); the period date strings
 * (`DD-MM-YYYY` / `MM-YYYY`) aren't lexically sortable, so period order is
 * derived from first appearance in `rows` rather than re-sorted.
 */
export function pivotExpenseStatistics(
  rows: ExpenseStatistic[]
): ExpenseStatisticSeries[] {
  const dates: string[] = [];
  const budgets = new Map<number, string>();
  const totalByBudgetAndDate = new Map<string, number>();

  for (const row of rows) {
    if (!dates.includes(row.date)) dates.push(row.date);
    if (!budgets.has(row.budgetId)) budgets.set(row.budgetId, row.budgetName);
    totalByBudgetAndDate.set(`${row.budgetId}|${row.date}`, row.total);
  }

  return [...budgets.entries()]
    .sort(([, aName], [, bName]) => aName.localeCompare(bName))
    .map(([budgetId, budgetName]) => ({
      budgetId,
      budgetName,
      points: dates.map((date) => ({
        date,
        total: totalByBudgetAndDate.get(`${budgetId}|${date}`) ?? 0,
      })),
    }));
}

export function combineExpenseStatistics(
  rows: ExpenseStatistic[]
): { date: string; total: number }[] {
  const dates: string[] = [];
  const totalByDate = new Map<string, number>();

  for (const row of rows) {
    if (!dates.includes(row.date)) dates.push(row.date);
    totalByDate.set(row.date, (totalByDate.get(row.date) ?? 0) + row.total);
  }

  return dates.map((date) => ({ date, total: totalByDate.get(date) ?? 0 }));
}
