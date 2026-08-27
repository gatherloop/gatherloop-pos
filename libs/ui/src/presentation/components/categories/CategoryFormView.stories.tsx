import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryFormView } from './CategoryFormView';

const meta: Meta<typeof CategoryFormView> = {
  title: 'Features/Categories/CategoryFormView',
  component: CategoryFormView,
};

export default meta;
type Story = StoryObj<typeof CategoryFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { name: '', station: 'NONE' },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: { name: 'Beverages', station: 'BAR' },
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
