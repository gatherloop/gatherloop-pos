import type { Meta, StoryObj } from '@storybook/react';
import { BudgetListItem } from './BudgetListItem';

const meta: Meta<typeof BudgetListItem> = {
  title: 'Features/Budgets/BudgetListItem',
  component: BudgetListItem,
  args: {
    id: 1,
    name: 'Operations',
    balance: 1500000,
    percentage: 30,
  },
};

export default meta;
type Story = StoryObj<typeof BudgetListItem>;

export const Default: Story = {};

export const Marketing: Story = {
  args: {
    id: 2,
    name: 'Marketing',
    balance: 1000000,
    percentage: 20,
  },
};

export const LowBalance: Story = {
  args: {
    id: 3,
    name: 'Logistics',
    balance: 50000,
    percentage: 5,
  },
};
