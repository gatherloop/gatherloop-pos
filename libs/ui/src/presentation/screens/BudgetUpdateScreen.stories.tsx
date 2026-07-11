import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { BudgetUpdateScreen } from './BudgetUpdateScreen';
import type { BudgetForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<BudgetForm>({
    defaultValues: { name: 'Restock', percentage: 30 },
  });
  return (
    <BudgetUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      onLogoutPress={fn()}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<BudgetForm>({
    defaultValues: { name: '', percentage: 0 },
  });
  return (
    <BudgetUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof BudgetUpdateScreen> = {
  title: 'Screens/Budgets/BudgetUpdateScreen',
  component: BudgetUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BudgetUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
