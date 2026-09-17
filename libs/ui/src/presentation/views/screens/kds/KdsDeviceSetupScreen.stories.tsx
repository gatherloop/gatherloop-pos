import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { KdsDeviceSetupScreen } from './KdsDeviceSetupScreen';

const meta: Meta<typeof KdsDeviceSetupScreen> = {
  title: 'Screens/Kds/KdsDeviceSetupScreen',
  component: KdsDeviceSetupScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof KdsDeviceSetupScreen>;

export const Idle: Story = {
  args: {
    defaultValues: { name: '' },
    formVariant: { type: 'loaded' },
    isRegisterDisabled: false,
    isRegistering: false,
    isPermissionDenied: false,
    onSubmit: fn(),
    onOpenSettings: fn(),
    isSendingTestNotification: false,
    isTestNotificationSent: false,
    onSendTestNotification: fn(),
    onUnregister: fn(),
    onLogout: fn(),
  },
};

export const PermissionDenied: Story = {
  args: {
    ...Idle.args,
    isPermissionDenied: true,
  },
};

export const Registering: Story = {
  args: {
    ...Idle.args,
    defaultValues: { name: "Andi's phone" },
    isRegisterDisabled: true,
    isRegistering: true,
  },
};

export const RegisterError: Story = {
  args: {
    ...Idle.args,
    defaultValues: { name: "Andi's phone" },
    registerError: 'Failed to register device',
  },
};

export const Registered: Story = {
  args: {
    ...Idle.args,
    registeredDevice: {
      id: 1,
      name: "Andi's phone",
      pushToken: 'ExponentPushToken[mock-token-1]',
      platform: 'android',
      createdAt: '2024-03-20T00:00:00.000Z',
    },
  },
};

export const RegisteredSendingTestNotification: Story = {
  args: {
    ...Registered.args,
    isSendingTestNotification: true,
  },
};

export const RegisteredTestNotificationSent: Story = {
  args: {
    ...Registered.args,
    isTestNotificationSent: true,
  },
};

export const RegisteredTestNotificationError: Story = {
  args: {
    ...Registered.args,
    testNotificationError: 'Failed to send test notification',
  },
};
