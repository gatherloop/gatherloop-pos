import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { KdsDeviceSetupForm } from './KdsDeviceSetupForm';

const meta: Meta<typeof KdsDeviceSetupForm> = {
  title: 'Components/Kds/KdsDeviceSetupForm',
  component: KdsDeviceSetupForm,
};

export default meta;
type Story = StoryObj<typeof KdsDeviceSetupForm>;

export const Default: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { name: '' },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    defaultValues: { name: "Andi's phone" },
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};

export const ServerError: Story = {
  args: {
    ...Default.args,
    serverError: 'Failed to register device',
  },
};
