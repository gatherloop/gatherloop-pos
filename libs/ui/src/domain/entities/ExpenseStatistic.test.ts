import { Budget } from './Budget';
import {
  combineExpenseStatistics,
  computeExpenseVariance,
  ExpenseStatistic,
  pivotExpenseStatistics,
} from './ExpenseStatistic';
import { TransactionStatistic } from './TransactionStatistic';

describe('pivotExpenseStatistics', () => {
  it('returns an empty array for empty input', () => {
    expect(pivotExpenseStatistics([])).toEqual([]);
  });

  it('builds one series per budget with matching periods', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 100 },
      { date: '01-2025', budgetId: 2, budgetName: 'Salary', total: 200 },
      { date: '02-2025', budgetId: 1, budgetName: 'Restock', total: 150 },
      { date: '02-2025', budgetId: 2, budgetName: 'Salary', total: 250 },
    ];

    expect(pivotExpenseStatistics(rows)).toEqual([
      {
        budgetId: 1,
        budgetName: 'Restock',
        points: [
          { date: '01-2025', total: 100 },
          { date: '02-2025', total: 150 },
        ],
      },
      {
        budgetId: 2,
        budgetName: 'Salary',
        points: [
          { date: '01-2025', total: 200 },
          { date: '02-2025', total: 250 },
        ],
      },
    ]);
  });

  it('zero-fills periods where a budget had no spend', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 100 },
      { date: '02-2025', budgetId: 1, budgetName: 'Restock', total: 150 },
      { date: '02-2025', budgetId: 2, budgetName: 'Salary', total: 250 },
    ];

    expect(pivotExpenseStatistics(rows)).toEqual([
      {
        budgetId: 1,
        budgetName: 'Restock',
        points: [
          { date: '01-2025', total: 100 },
          { date: '02-2025', total: 150 },
        ],
      },
      {
        budgetId: 2,
        budgetName: 'Salary',
        points: [
          { date: '01-2025', total: 0 },
          { date: '02-2025', total: 250 },
        ],
      },
    ]);
  });

  it('preserves the chronological period order of the input rows', () => {
    const rows: ExpenseStatistic[] = [
      { date: '11-2024', budgetId: 1, budgetName: 'Restock', total: 50 },
      { date: '12-2024', budgetId: 1, budgetName: 'Restock', total: 60 },
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 70 },
    ];

    expect(pivotExpenseStatistics(rows)[0].points.map((p) => p.date)).toEqual(
      ['11-2024', '12-2024', '01-2025']
    );
  });

  it('sorts series alphabetically by budget name', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 2, budgetName: 'Salary', total: 200 },
      { date: '01-2025', budgetId: 1, budgetName: 'Operational', total: 100 },
    ];

    expect(pivotExpenseStatistics(rows).map((s) => s.budgetName)).toEqual([
      'Operational',
      'Salary',
    ]);
  });

  it('handles a single budget', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 100 },
    ];

    expect(pivotExpenseStatistics(rows)).toEqual([
      {
        budgetId: 1,
        budgetName: 'Restock',
        points: [{ date: '01-2025', total: 100 }],
      },
    ]);
  });
});

describe('combineExpenseStatistics', () => {
  it('returns an empty array for empty input', () => {
    expect(combineExpenseStatistics([])).toEqual([]);
  });

  it('sums totals per period across budgets', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 100 },
      { date: '01-2025', budgetId: 2, budgetName: 'Salary', total: 200 },
      { date: '02-2025', budgetId: 1, budgetName: 'Restock', total: 150 },
    ];

    expect(combineExpenseStatistics(rows)).toEqual([
      { date: '01-2025', total: 300 },
      { date: '02-2025', total: 150 },
    ]);
  });

  it('preserves the chronological period order of the input rows', () => {
    const rows: ExpenseStatistic[] = [
      { date: '11-2024', budgetId: 1, budgetName: 'Restock', total: 50 },
      { date: '12-2024', budgetId: 1, budgetName: 'Restock', total: 60 },
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 70 },
    ];

    expect(combineExpenseStatistics(rows).map((p) => p.date)).toEqual([
      '11-2024',
      '12-2024',
      '01-2025',
    ]);
  });
});

describe('computeExpenseVariance', () => {
  const budget = (overrides: Partial<Budget>): Budget => ({
    id: 1,
    name: 'Budget',
    percentage: 0,
    balance: 0,
    createdAt: '2024-03-20T00:00:00.000Z',
    ...overrides,
  });

  const revenue = (totalIncome: number): TransactionStatistic[] => [
    { date: '01-2025', total: totalIncome, totalIncome },
  ];

  it('computes actual % of revenue and delta against target', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 3500 },
    ];
    const budgets = [budget({ id: 1, name: 'Restock', percentage: 30 })];

    const report = computeExpenseVariance(rows, revenue(10000), budgets);

    expect(report.totalRevenue).toEqual(10000);
    expect(report.rows).toEqual([
      {
        budgetId: 1,
        budgetName: 'Restock',
        targetPercentage: 30,
        actualAmount: 3500,
        actualPercentage: 35,
        deltaPercentage: 5,
        isOverTarget: true,
      },
    ]);
    expect(report.unspentPercentage).toEqual(65);
  });

  it('does not flag a budget under its target as over-target', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 2000 },
    ];
    const budgets = [budget({ id: 1, name: 'Restock', percentage: 30 })];

    const report = computeExpenseVariance(rows, revenue(10000), budgets);

    expect(report.rows[0].deltaPercentage).toEqual(-10);
    expect(report.rows[0].isOverTarget).toBeFalsy();
  });

  it('shows "no target" (null) for a budget with target 0, even with expenses', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Misc', total: 1000 },
    ];
    const budgets = [budget({ id: 1, name: 'Misc', percentage: 0 })];

    const report = computeExpenseVariance(rows, revenue(10000), budgets);

    expect(report.rows[0].targetPercentage).toBeNull();
    expect(report.rows[0].deltaPercentage).toBeNull();
    expect(report.rows[0].actualPercentage).toEqual(10);
    expect(report.rows[0].isOverTarget).toBeFalsy();
  });

  it('includes a targeted budget with no expenses in the period (0 actual, negative delta)', () => {
    const budgets = [budget({ id: 1, name: 'Marketing', percentage: 15 })];

    const report = computeExpenseVariance([], revenue(10000), budgets);

    expect(report.rows).toEqual([
      {
        budgetId: 1,
        budgetName: 'Marketing',
        targetPercentage: 15,
        actualAmount: 0,
        actualPercentage: 0,
        deltaPercentage: -15,
        isOverTarget: false,
      },
    ]);
  });

  it('shows absolute amounts (no percentages) for a zero-revenue period, never dividing by zero', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 1, budgetName: 'Restock', total: 5000 },
    ];
    const budgets = [budget({ id: 1, name: 'Restock', percentage: 30 })];

    const report = computeExpenseVariance(rows, revenue(0), budgets);

    expect(report.totalRevenue).toEqual(0);
    expect(report.rows[0]).toEqual({
      budgetId: 1,
      budgetName: 'Restock',
      targetPercentage: 30,
      actualAmount: 5000,
      actualPercentage: null,
      deltaPercentage: null,
      isOverTarget: false,
    });
    expect(report.unspentPercentage).toBeNull();
  });

  it('surfaces an expense whose budget id is absent from the budget list (target "—")', () => {
    const rows: ExpenseStatistic[] = [
      { date: '01-2025', budgetId: 99, budgetName: 'Deleted Budget', total: 1000 },
    ];

    const report = computeExpenseVariance(rows, revenue(10000), []);

    expect(report.rows).toEqual([
      {
        budgetId: 99,
        budgetName: 'Deleted Budget',
        targetPercentage: null,
        actualAmount: 1000,
        actualPercentage: 10,
        deltaPercentage: null,
        isOverTarget: false,
      },
    ]);
  });

  it('returns an empty report for no expenses, no revenue, and no budgets', () => {
    expect(computeExpenseVariance([], [], [])).toEqual({
      rows: [],
      totalRevenue: 0,
      totalExpense: 0,
      unspentPercentage: null,
    });
  });

  it('sorts rows alphabetically by budget name', () => {
    const budgets = [
      budget({ id: 1, name: 'Salary', percentage: 20 }),
      budget({ id: 2, name: 'Operational', percentage: 25 }),
    ];

    const report = computeExpenseVariance([], revenue(10000), budgets);

    expect(report.rows.map((row) => row.budgetName)).toEqual([
      'Operational',
      'Salary',
    ]);
  });
});
