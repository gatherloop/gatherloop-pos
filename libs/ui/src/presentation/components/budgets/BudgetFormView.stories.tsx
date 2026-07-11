import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { BudgetFormView } from './BudgetFormView';
import type { BudgetForm } from '../../../domain';

const defaultValues: BudgetForm = { name: '', percentage: 0 };

const LoadedStory = () => {
  const form = useForm<BudgetForm>({ defaultValues });
  return (
    <BudgetFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<BudgetForm>({
    defaultValues: { name: 'Restock', percentage: 30 },
  });
  return (
    <BudgetFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const meta: Meta<typeof BudgetFormView> = {
  title: 'Features/Budgets/BudgetFormView',
  component: BudgetFormView,
};

export default meta;
type Story = StoryObj<typeof BudgetFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

const LoadingStory = () => {
  const form = useForm<BudgetForm>({ defaultValues });
  return (
    <BudgetFormView
      variant={{ type: 'loading' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
    />
  );
};

const ErrorStory = () => {
  const form = useForm<BudgetForm>({ defaultValues });
  return (
    <BudgetFormView
      variant={{ type: 'error', onRetryButtonPress: fn() }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
    />
  );
};

export const Loading: Story = {
  render: () => <LoadingStory />,
};

export const Error: Story = {
  render: () => <ErrorStory />,
};
