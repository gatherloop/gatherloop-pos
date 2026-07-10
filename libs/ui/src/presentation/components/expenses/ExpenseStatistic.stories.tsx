import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseStatistic } from './ExpenseStatistic';

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
  {
    budgetId: 3,
    budgetName: 'Salary',
    points: [
      { x: '2024-01', y: 8000000 },
      { x: '2024-02', y: 8000000 },
      { x: '2024-03', y: 8500000 },
    ],
  },
];

const mockCombinedStatistics = [
  { x: '2024-01', y: 25000000 },
  { x: '2024-02', y: 23700000 },
  { x: '2024-03', y: 27300000 },
];

const meta: Meta<typeof ExpenseStatistic> = {
  title: 'Features/Expenses/ExpenseStatistic',
  component: ExpenseStatistic,
  args: {
    view: 'budget',
    onViewChange: fn(),
    groupBy: 'month',
    onGroupByChange: fn(),
    onRetryButtonPress: fn(),
    onDateRangeChange: fn(),
    preset: 'last12Months',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    budgetSeries: mockBudgetSeries,
    combinedStatistics: mockCombinedStatistics,
  },
};

export default meta;
type Story = StoryObj<typeof ExpenseStatistic>;

export const SplitView: Story = {
  args: {
    variant: { type: 'loaded' },
    view: 'budget',
  },
};

export const CombinedView: Story = {
  args: {
    variant: { type: 'loaded' },
    view: 'combined',
  },
};

export const SingleBudget: Story = {
  args: {
    variant: { type: 'loaded' },
    view: 'budget',
    budgetSeries: [mockBudgetSeries[0]],
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};

export const EmptyRange: Story = {
  args: {
    variant: { type: 'loaded' },
    preset: 'thisMonth',
    budgetSeries: [],
    combinedStatistics: [],
  },
};
