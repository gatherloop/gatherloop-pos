import type { Meta, StoryObj } from '@storybook/react';
import { ExpenseVarianceList } from './ExpenseVarianceList';

const defaultArgs = {
  rows: [
    {
      budgetId: 1,
      budgetName: 'Restock',
      targetPercentage: 30,
      actualAmount: 3500000,
      actualPercentage: 35,
      deltaPercentage: 5,
      isOverTarget: true,
    },
    {
      budgetId: 2,
      budgetName: 'Operational',
      targetPercentage: 25,
      actualAmount: 2000000,
      actualPercentage: 20,
      deltaPercentage: -5,
      isOverTarget: false,
    },
    {
      budgetId: 3,
      budgetName: 'Misc',
      targetPercentage: null,
      actualAmount: 500000,
      actualPercentage: 5,
      deltaPercentage: null,
      isOverTarget: false,
    },
  ],
  totalRevenue: 10000000,
  totalExpense: 6000000,
  unspentPercentage: 40,
};

const meta: Meta<typeof ExpenseVarianceList> = {
  title: 'Features/Expenses/ExpenseVarianceList',
  component: ExpenseVarianceList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ExpenseVarianceList>;

export const Loaded: Story = {};

export const Empty: Story = {
  args: { rows: [] },
};

export const ZeroRevenue: Story = {
  args: {
    rows: defaultArgs.rows.map((row) => ({
      ...row,
      actualPercentage: null,
      deltaPercentage: null,
      isOverTarget: false,
    })),
    totalRevenue: 0,
    unspentPercentage: null,
  },
};
