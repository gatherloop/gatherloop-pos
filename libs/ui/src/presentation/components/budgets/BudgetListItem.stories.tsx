import type { Meta, StoryObj } from '@storybook/react';
import { BudgetListItem } from './BudgetListItem';

const meta: Meta<typeof BudgetListItem> = {
  title: 'Features/Budgets/BudgetListItem',
  component: BudgetListItem,
  args: {
    id: 1,
    name: 'Raw Materials',
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
    percentage: 20,
  },
};

export const NoTarget: Story = {
  args: {
    id: 3,
    name: 'Operations',
    percentage: 0,
  },
};
