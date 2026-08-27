import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { LoginForm as LoginFormView } from './LoginFormView';

const meta: Meta<typeof LoginFormView> = {
  title: 'Features/Auth/LoginForm',
  component: LoginFormView,
};

export default meta;
type Story = StoryObj<typeof LoginFormView>;

export const Default: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { username: '', password: '' },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Prefilled: Story = {
  args: {
    ...Default.args,
    defaultValues: { username: 'admin', password: '' },
  },
};

export const SubmitDisabled: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
