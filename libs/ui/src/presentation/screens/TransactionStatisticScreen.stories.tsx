import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionStatisticScreen } from './TransactionStatisticScreen';

const mockTotalStatistics = [
  { x: '2024-01-15', y: 30000000 },
  { x: '2024-01-16', y: 17000000 },
  { x: '2024-01-17', y: 45000000 },
  { x: '2024-01-18', y: 22000000 },
  { x: '2024-01-19', y: 38000000 },
];

const mockTotalIncomeStatistics = [
  { x: '2024-01-15', y: 28000000 },
  { x: '2024-01-16', y: 16000000 },
  { x: '2024-01-17', y: 43000000 },
  { x: '2024-01-18', y: 20000000 },
  { x: '2024-01-19', y: 36000000 },
];

const defaultArgs = {
  onLogoutPress: fn(),
  onGroupByChange: fn(),
  onRetryButtonPress: fn(),
  totalStatistics: mockTotalStatistics,
  totalIncomeStatistics: mockTotalIncomeStatistics,
  groupBy: 'date' as const,
};

const meta: Meta<typeof TransactionStatisticScreen> = {
  title: 'Screens/Transactions/TransactionStatisticScreen',
  component: TransactionStatisticScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TransactionStatisticScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded' } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const GroupByMonth: Story = {
  args: {
    variant: { type: 'loaded' },
    groupBy: 'month' as const,
    totalStatistics: [
      { x: '2024-01', y: 152000000 },
      { x: '2024-02', y: 178000000 },
      { x: '2024-03', y: 134000000 },
    ],
    totalIncomeStatistics: [
      { x: '2024-01', y: 143000000 },
      { x: '2024-02', y: 167000000 },
      { x: '2024-03', y: 125000000 },
    ],
  },
};
