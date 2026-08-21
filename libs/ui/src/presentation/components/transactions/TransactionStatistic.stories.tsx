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
    onDateRangeChange: fn(),
    preset: 'last30Days',
    startDate: '2024-01-15',
    endDate: '2024-01-21',
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
    preset: 'last12Months',
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

export const CustomRangeSelected: Story = {
  args: {
    variant: { type: 'loaded' },
    preset: 'custom',
    startDate: '2024-01-15',
    endDate: '2024-01-21',
  },
};

export const EmptyRange: Story = {
  args: {
    variant: { type: 'loaded' },
    preset: 'thisMonth',
    totalStatistics: [],
    totalIncomeStatistics: [],
  },
};

// Phase 10 of docs/prd-transaction-mobile-ux.md (FR-10): at 360px the chart
// is measured to fit its container with no horizontal page scroll, the
// y-axis padding is reduced so labels stay readable, and preset/group-by
// buttons wrap without overflow.
export const Mobile: Story = {
  args: {
    variant: { type: 'loaded' },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

// Phase 10: the custom-range date inputs and Apply button stack vertically
// and remain usable at 360px.
export const MobileCustomRange: Story = {
  args: {
    variant: { type: 'loaded' },
    preset: 'custom',
    startDate: '2024-01-15',
    endDate: '2024-01-21',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
