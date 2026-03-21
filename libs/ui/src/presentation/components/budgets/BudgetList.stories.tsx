import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BudgetList } from './BudgetList';
import { mockBudgets } from '../../../../.storybook/mocks/mockData';

const mockBudgetItems = mockBudgets.map((b) => ({
  id: b.id,
  name: b.name,
  balance: b.balance,
  percentage: b.percentage,
}));

const meta: Meta<typeof BudgetList> = {
  title: 'Features/Budgets/BudgetList',
  component: BudgetList,
  args: {
    onRetryButtonPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BudgetList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockBudgetItems },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
