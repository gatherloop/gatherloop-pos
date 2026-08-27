import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseUpdateScreen } from './ExpenseUpdateScreen';
import { mockWallets, mockBudgets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));
const budgetSelectOptions = mockBudgets.map((b) => ({ label: b.name, value: b.id }));

const meta: Meta<typeof ExpenseUpdateScreen> = {
  title: 'Screens/Expenses/ExpenseUpdateScreen',
  component: ExpenseUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ExpenseUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: {
      walletId: 1,
      budgetId: 1,
      expenseItems: [
        { name: 'Coffee Beans', unit: 'kg', price: 80000, amount: 3 },
      ],
    },
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
    defaultValues: { walletId: 1, budgetId: 1, expenseItems: [] },
    walletSelectOptions: [],
    budgetSelectOptions: [],
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
