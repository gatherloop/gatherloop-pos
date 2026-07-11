import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { BudgetCreateScreen } from './BudgetCreateScreen';
import type { BudgetForm } from '../../domain';

const defaultValues: BudgetForm = { name: '', percentage: 0 };

const CreateStory = () => {
  const form = useForm<BudgetForm>({ defaultValues });
  return (
    <BudgetCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof BudgetCreateScreen> = {
  title: 'Screens/Budgets/BudgetCreateScreen',
  component: BudgetCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BudgetCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
