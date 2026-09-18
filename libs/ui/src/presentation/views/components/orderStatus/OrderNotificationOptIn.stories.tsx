import type { Meta, StoryObj } from '@storybook/react';
import { OrderNotificationOptIn } from './OrderNotificationOptIn';

const meta: Meta<typeof OrderNotificationOptIn> = {
  title: 'Components/OrderStatus/OrderNotificationOptIn',
  component: OrderNotificationOptIn,
};

export default meta;
type Story = StoryObj<typeof OrderNotificationOptIn>;

export const Idle: Story = {
  args: {
    variant: {
      type: 'idle',
      onSubscribePress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const NeedsInstall: Story = {
  args: { variant: { type: 'needsInstall' } },
};

export const PermissionDenied: Story = {
  args: { variant: { type: 'permissionDenied' } },
};

export const Subscribing: Story = {
  args: { variant: { type: 'subscribing' } },
};

export const SubscribeError: Story = {
  args: {
    variant: {
      type: 'subscribeError',
      errorMessage: 'Failed to enable notifications',
      onRetryPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const Subscribed: Story = {
  args: {
    variant: {
      type: 'subscribed',
      onUnsubscribePress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const Hidden: Story = {
  args: { variant: { type: 'hidden' } },
};
