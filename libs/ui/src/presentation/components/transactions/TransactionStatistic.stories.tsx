import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionStatistic } from './TransactionStatistic';

const mockDailyData = [
  { x: '2024-01-15', y: 5000000 },
  { x: '2024-01-16', y: 8000000 },
  { x: '2024-01-17', y: 3000000 },
  { x: '2024-01-18', y: 12000000 },
  { x: '2024-01-19', y: 7000000 },
  { x: '2024-01-20', y: 9000000 },
  { x: '2024-01-21', y: 6000000 },
];

const mockIncomeData = mockDailyData.map((d) => ({ ...d, y: d.y * 0.85 }));

const meta: Meta<typeof TransactionStatistic> = {
  title: 'Features/Transactions/TransactionStatistic',
  component: TransactionStatistic,
  args: {
    groupBy: 'date',
    onGroupByChange: fn(),
    onRetryButtonPress: fn(),
    totalStatistics: mockDailyData,
    totalIncomeStatistics: mockIncomeData,
  },
};

export default meta;
type Story = StoryObj<typeof TransactionStatistic>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
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

export const MonthlyGroupBy: Story = {
  args: {
    variant: { type: 'loaded' },
    groupBy: 'month',
    totalStatistics: [
      { x: '2024-01', y: 45000000 },
      { x: '2024-02', y: 52000000 },
      { x: '2024-03', y: 38000000 },
    ],
    totalIncomeStatistics: [
      { x: '2024-01', y: 38000000 },
      { x: '2024-02', y: 44000000 },
      { x: '2024-03', y: 32000000 },
    ],
  },
};
