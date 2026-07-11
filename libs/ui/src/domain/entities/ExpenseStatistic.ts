import { Budget } from './Budget';
import { TransactionStatistic } from './TransactionStatistic';
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

export type ExpenseVarianceRow = {
  budgetId: number;
  budgetName: string;
  /** null means the budget has no target (percentage 0) — render "—". */
  targetPercentage: number | null;
  actualAmount: number;
  /** null when the period has zero revenue — render the absolute amount instead. */
  actualPercentage: number | null;
  /** actual % − target %; null whenever either side is unavailable. */
  deltaPercentage: number | null;
  isOverTarget: boolean;
};

export type ExpenseVarianceReport = {
  rows: ExpenseVarianceRow[];
  totalRevenue: number;
  totalExpense: number;
  /** 100 − Σ actual %; null when the period has zero revenue. */
  unspentPercentage: number | null;
};

/**
 * Actual % is expense total ÷ period revenue (`TransactionStatistic.totalIncome`,
 * i.e. net income — the same figure the old budget-allocation loop used), matching
 * how `Budget.percentage` targets are defined. Budgets are merged with expense rows
 * by id so a budget with no spend still gets a row, and an expense referencing a
 * budget outside the current budget list still surfaces (target shows as "—").
 */
export function computeExpenseVariance(
  expenseStatistics: ExpenseStatistic[],
  transactionStatistics: TransactionStatistic[],
  budgets: Budget[]
): ExpenseVarianceReport {
  const totalRevenue = transactionStatistics.reduce(
    (sum, statistic) => sum + statistic.totalIncome,
    0
  );

  const budgetIds: number[] = [];
  const nameByBudgetId = new Map<number, string>();
  const actualAmountByBudgetId = new Map<number, number>();

  for (const row of expenseStatistics) {
    if (!budgetIds.includes(row.budgetId)) budgetIds.push(row.budgetId);
    nameByBudgetId.set(row.budgetId, row.budgetName);
    actualAmountByBudgetId.set(
      row.budgetId,
      (actualAmountByBudgetId.get(row.budgetId) ?? 0) + row.total
    );
  }

  for (const budget of budgets) {
    if (!budgetIds.includes(budget.id)) budgetIds.push(budget.id);
    if (!nameByBudgetId.has(budget.id)) nameByBudgetId.set(budget.id, budget.name);
  }

  const targetByBudgetId = new Map(
    budgets.map((budget) => [budget.id, budget.percentage])
  );

  const rows: ExpenseVarianceRow[] = budgetIds
    .map((budgetId) => {
      const actualAmount = actualAmountByBudgetId.get(budgetId) ?? 0;
      const targetPercentage = targetByBudgetId.get(budgetId) ?? 0;
      const actualPercentage =
        totalRevenue > 0 ? (actualAmount / totalRevenue) * 100 : null;
      const hasTarget = targetPercentage > 0;
      const deltaPercentage =
        hasTarget && actualPercentage !== null
          ? actualPercentage - targetPercentage
          : null;

      return {
        budgetId,
        budgetName: nameByBudgetId.get(budgetId) ?? '',
        targetPercentage: hasTarget ? targetPercentage : null,
        actualAmount,
        actualPercentage,
        deltaPercentage,
        isOverTarget: deltaPercentage !== null && deltaPercentage > 0,
      };
    })
    .sort((a, b) => a.budgetName.localeCompare(b.budgetName));

  const totalExpense = rows.reduce((sum, row) => sum + row.actualAmount, 0);
  const unspentPercentage =
    totalRevenue > 0 ? 100 - (totalExpense / totalRevenue) * 100 : null;

  return { rows, totalRevenue, totalExpense, unspentPercentage };
}
