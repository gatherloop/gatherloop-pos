import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BudgetListScreen } from './BudgetListScreen';
import { mockBudgets } from '../../../.storybook/mocks/mockData';

const mockBudgetItems = mockBudgets.map((b) => ({
  id: b.id,
  name: b.name,
  balance: b.balance,
  percentage: b.percentage,
}));

const defaultArgs = {
  onLogoutPress: fn(),
  onRetryButtonPress: fn(),
};

const meta: Meta<typeof BudgetListScreen> = {
  title: 'Screens/Budgets/BudgetListScreen',
  component: BudgetListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof BudgetListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockBudgetItems } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};
