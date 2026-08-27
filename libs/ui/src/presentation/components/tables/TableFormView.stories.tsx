import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableFormView } from './TableFormView';

const meta: Meta<typeof TableFormView> = {
  title: 'Features/Tables/TableFormView',
  component: TableFormView,
};

export default meta;
type Story = StoryObj<typeof TableFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { label: '', floorNumber: 1 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: { label: 'Meja 01', floorNumber: 1 },
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
