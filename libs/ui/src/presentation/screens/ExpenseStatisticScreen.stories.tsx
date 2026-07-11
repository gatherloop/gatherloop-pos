import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseStatisticScreen } from './ExpenseStatisticScreen';

const mockBudgetSeries = [
  {
    budgetId: 1,
    budgetName: 'Operational',
    points: [
      { x: '2024-01', y: 5000000 },
      { x: '2024-02', y: 6200000 },
      { x: '2024-03', y: 4800000 },
    ],
  },
  {
    budgetId: 2,
    budgetName: 'Restock',
    points: [
      { x: '2024-01', y: 12000000 },
      { x: '2024-02', y: 9500000 },
      { x: '2024-03', y: 14000000 },
    ],
  },
];

const mockCombinedStatistics = [
  { x: '2024-01', y: 17000000 },
  { x: '2024-02', y: 15700000 },
  { x: '2024-03', y: 18800000 },
];

const mockVarianceRows = [
  {
    budgetId: 1,
    budgetName: 'Operational',
    targetPercentage: 25,
    actualAmount: 16000000,
    actualPercentage: 20,
    deltaPercentage: -5,
    isOverTarget: false,
  },
  {
    budgetId: 2,
    budgetName: 'Restock',
    targetPercentage: 30,
    actualAmount: 35500000,
    actualPercentage: 44.4,
    deltaPercentage: 14.4,
    isOverTarget: true,
  },
];

const defaultArgs = {
  onViewChange: fn(),
  onGroupByChange: fn(),
  onRetryButtonPress: fn(),
  onDateRangeChange: fn(),
  view: 'budget' as const,
  budgetSeries: mockBudgetSeries,
  combinedStatistics: mockCombinedStatistics,
  groupBy: 'month' as const,
  preset: 'last12Months' as const,
  startDate: '2024-01-01',
  endDate: '2024-03-31',
  varianceRows: mockVarianceRows,
  totalRevenue: 80000000,
  totalExpense: 51500000,
  unspentPercentage: 35.6,
};

const meta: Meta<typeof ExpenseStatisticScreen> = {
  title: 'Screens/Expenses/ExpenseStatisticScreen',
  component: ExpenseStatisticScreen,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ExpenseStatisticScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded' } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const CombinedView: Story = {
  args: { variant: { type: 'loaded' }, view: 'combined' as const },
};
