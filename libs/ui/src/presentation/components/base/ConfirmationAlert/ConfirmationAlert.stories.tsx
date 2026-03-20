import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { Button, YStack } from 'tamagui';
import { ConfirmationAlert } from './ConfirmationAlert';

const ConfirmationAlertDemo = ({
  title,
  description,
  confirmText,
  cancelText,
}: {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <YStack gap="$3" padding="$4">
      <Button onPress={() => setIsOpen(true)}>Open Alert</Button>
      <ConfirmationAlert
        title={title}
        description={description}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={() => {
          fn()();
          setIsOpen(false);
        }}
        onCancel={() => setIsOpen(false)}
      />
    </YStack>
  );
};

const meta: Meta<typeof ConfirmationAlert> = {
  title: 'Base/ConfirmationAlert',
  component: ConfirmationAlert,
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed? This action cannot be undone.',
    isOpen: false,
    onOpenChange: fn(),
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmationAlert>;

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

export const Open: Story = {
  args: {
    isOpen: true,
  },
};

export const DeleteConfirmation: Story = {
  args: {
    isOpen: true,
    title: 'Delete Product',
    description: 'Are you sure you want to delete this product? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  },
};

export const LogoutConfirmation: Story = {
  args: {
    isOpen: true,
    title: 'Logout',
    description: 'Are you sure you want to logout from your account?',
    confirmText: 'Logout',
    cancelText: 'Stay',
  },
};

export const Interactive: Story = {
  render: () => (
    <ConfirmationAlertDemo
      title="Delete Item"
      description="This will permanently remove the item. Are you sure?"
      confirmText="Delete"
      cancelText="Cancel"
    />
  ),
};

export const InteractiveLogout: Story = {
  render: () => (
    <ConfirmationAlertDemo
      title="Logout"
      description="You will be logged out of your account."
      confirmText="Yes, Logout"
      cancelText="No, Stay"
    />
  ),
};
