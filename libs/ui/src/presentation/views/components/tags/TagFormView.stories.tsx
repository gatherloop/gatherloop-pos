import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagFormView } from './TagFormView';

const meta: Meta<typeof TagFormView> = {
  title: 'Components/Tags/TagFormView',
  component: TagFormView,
};

export default meta;
type Story = StoryObj<typeof TagFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: {
      name: '',
      color: 'gray',
      isHighlighted: false,
      sortOrder: 0,
    },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      name: 'Best Seller',
      color: 'orange',
      isHighlighted: true,
      sortOrder: 2,
    },
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
