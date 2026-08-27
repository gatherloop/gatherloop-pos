import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseCreateScreen } from './ExpenseCreateScreen';
import { mockWallets, mockBudgets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));
const budgetSelectOptions = mockBudgets.map((b) => ({ label: b.name, value: b.id }));

const meta: Meta<typeof ExpenseCreateScreen> = {
  title: 'Screens/Expenses/ExpenseCreateScreen',
  component: ExpenseCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ExpenseCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { walletId: 1, budgetId: 1, expenseItems: [] },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    walletSelectOptions,
    budgetSelectOptions,
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    walletSelectOptions: [],
    budgetSelectOptions: [],
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
