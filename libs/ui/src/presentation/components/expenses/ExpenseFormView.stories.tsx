import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ExpenseFormView } from './ExpenseFormView';
import type { ExpenseForm } from '../../../domain';

const walletOptions = [
  { label: 'Cash', value: 1 },
  { label: 'Bank Transfer', value: 2 },
  { label: 'QRIS', value: 3 },
];

const budgetOptions = [
  { label: 'Operations', value: 1 },
  { label: 'Marketing', value: 2 },
  { label: 'Logistics', value: 3 },
];

const defaultValues: ExpenseForm = {
  walletId: 1,
  budgetId: 1,
  expenseItems: [],
};

const LoadedStory = () => {
  const form = useForm<ExpenseForm>({ defaultValues });
  return (
    <ExpenseFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletOptions}
      budgetSelectOptions={budgetOptions}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<ExpenseForm>({
    defaultValues: {
      walletId: 1,
      budgetId: 1,
      expenseItems: [
        { name: 'Office Supplies', unit: 'pcs', price: 50000, amount: 5 },
        { name: 'Printer Paper', unit: 'ream', price: 50000, amount: 1 },
      ],
    },
  });
  return (
    <ExpenseFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletOptions}
      budgetSelectOptions={budgetOptions}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
    />
  );
};

const meta: Meta<typeof ExpenseFormView> = {
  title: 'Features/Expenses/ExpenseFormView',
  component: ExpenseFormView,
};

export default meta;
type Story = StoryObj<typeof ExpenseFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const Loading: Story = {
  render: () => {
    const form = useForm<ExpenseForm>({ defaultValues });
    return (
      <ExpenseFormView
        variant={{ type: 'loading' }}
        form={form}
        onSubmit={fn()}
        walletSelectOptions={walletOptions}
        budgetSelectOptions={budgetOptions}
        isSubmitDisabled={true}
        onRetryButtonPress={fn()}
      />
    );
  },
};

export const Error: Story = {
  render: () => {
    const form = useForm<ExpenseForm>({ defaultValues });
    return (
      <ExpenseFormView
        variant={{ type: 'error' }}
        form={form}
        onSubmit={fn()}
        walletSelectOptions={walletOptions}
        budgetSelectOptions={budgetOptions}
        isSubmitDisabled={true}
        onRetryButtonPress={fn()}
      />
    );
  },
};
