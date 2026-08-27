import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseFormView } from './ExpenseFormView';

const walletSelectOptions = [
  { label: 'Cash', value: 1 },
  { label: 'Bank Transfer', value: 2 },
  { label: 'QRIS', value: 3 },
];

const budgetSelectOptions = [
  { label: 'Raw Materials', value: 1 },
  { label: 'Marketing', value: 2 },
  { label: 'Operations', value: 3 },
];

const meta: Meta<typeof ExpenseFormView> = {
  title: 'Features/Expenses/ExpenseFormView',
  component: ExpenseFormView,
};

export default meta;
type Story = StoryObj<typeof ExpenseFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { walletId: 1, budgetId: 1, expenseItems: [] },
    onSubmit: fn(),
    walletSelectOptions,
    budgetSelectOptions,
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      walletId: 1,
      budgetId: 1,
      expenseItems: [
        { name: 'Coffee Beans', unit: 'kg', price: 80000, amount: 3 },
        { name: 'Fresh Milk', unit: 'liter', price: 15000, amount: 5 },
      ],
    },
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};
