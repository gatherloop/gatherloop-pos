import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { KdsLoginScreen } from './KdsLoginScreen';

const meta: Meta<typeof KdsLoginScreen> = {
  title: 'Screens/Kds/KdsLoginScreen',
  component: KdsLoginScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof KdsLoginScreen>;

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
    defaultValues: { username: 'andi', password: '••••••' },
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
