import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ExpenseUpdateScreen } from './ExpenseUpdateScreen';
import type { ExpenseForm } from '../../domain';
import { mockWallets, mockBudgets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));
const budgetSelectOptions = mockBudgets.map((b) => ({ label: b.name, value: b.id }));

const UpdateStory = () => {
  const form = useForm<ExpenseForm>({
    defaultValues: {
      walletId: 1,
      budgetId: 1,
      expenseItems: [
        { name: 'Coffee Beans', unit: 'kg', price: 80000, amount: 3 },
      ],
    },
  });
  return (
    <ExpenseUpdateScreen
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
  const form = useForm<ExpenseForm>({ defaultValues: { walletId: 1, budgetId: 1, expenseItems: [] } });
  return (
    <ExpenseUpdateScreen
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

const meta: Meta<typeof ExpenseUpdateScreen> = {
  title: 'Screens/Expenses/ExpenseUpdateScreen',
  component: ExpenseUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ExpenseUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
