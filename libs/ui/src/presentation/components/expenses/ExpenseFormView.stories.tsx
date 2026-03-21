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
  { label: 'Raw Materials', value: 1 },
  { label: 'Marketing', value: 2 },
  { label: 'Operations', value: 3 },
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
        { name: 'Coffee Beans', unit: 'kg', price: 80000, amount: 3 },
        { name: 'Fresh Milk', unit: 'liter', price: 15000, amount: 5 },
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

const LoadingStory = () => {
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
};

const ErrorStory = () => {
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
};

export const Loading: Story = {
  render: () => <LoadingStory />,
};

export const Error: Story = {
  render: () => <ErrorStory />,
};
