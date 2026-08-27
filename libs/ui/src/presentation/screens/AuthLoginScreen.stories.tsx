import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AuthLoginScreen } from './AuthLoginScreen';

const meta: Meta<typeof AuthLoginScreen> = {
  title: 'Screens/Auth/AuthLoginScreen',
  component: AuthLoginScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AuthLoginScreen>;

export const Default: Story = {
  args: {
    defaultValues: { username: '', password: '' },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    variant: { type: 'loaded' },
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    defaultValues: { username: 'admin', password: '••••••' },
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
