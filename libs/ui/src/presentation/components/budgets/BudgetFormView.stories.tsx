import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BudgetFormView } from './BudgetFormView';

const meta: Meta<typeof BudgetFormView> = {
  title: 'Features/Budgets/BudgetFormView',
  component: BudgetFormView,
};

export default meta;
type Story = StoryObj<typeof BudgetFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { name: '', percentage: 0 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: { name: 'Restock', percentage: 30 },
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

export const SubmitDisabled: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
  },
};

export const Submitting: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
