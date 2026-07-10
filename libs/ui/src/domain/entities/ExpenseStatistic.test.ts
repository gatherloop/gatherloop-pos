import {
  combineExpenseStatistics,
  ExpenseStatistic,
  pivotExpenseStatistics,
} from './ExpenseStatistic';

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
