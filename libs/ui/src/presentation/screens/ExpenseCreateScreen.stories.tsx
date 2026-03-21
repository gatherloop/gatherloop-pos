import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ExpenseCreateScreen } from './ExpenseCreateScreen';
import type { ExpenseForm } from '../../domain';
import { mockWallets, mockBudgets } from '../../../.storybook/mocks/mockData';

const defaultValues: ExpenseForm = { walletId: 1, budgetId: 1, expenseItems: [] };
const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));
const budgetSelectOptions = mockBudgets.map((b) => ({ label: b.name, value: b.id }));

const CreateStory = () => {
  const form = useForm<ExpenseForm>({ defaultValues });
  return (
    <ExpenseCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      walletSelectOptions={walletSelectOptions}
      budgetSelectOptions={budgetSelectOptions}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<ExpenseForm>({ defaultValues });
  return (
    <ExpenseCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      walletSelectOptions={[]}
      budgetSelectOptions={[]}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof ExpenseCreateScreen> = {
  title: 'Screens/Expenses/ExpenseCreateScreen',
  component: ExpenseCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ExpenseCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
