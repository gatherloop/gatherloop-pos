import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { Button, Paragraph, YStack } from 'tamagui';
import { Sheet } from './Sheet';

const SheetDemo = ({
  initialOpen = false,
  children,
}: {
  initialOpen?: boolean;
  children?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  return (
    <YStack gap="$3" padding="$4">
      <Button onPress={() => setIsOpen(true)}>Open Sheet</Button>
      <Sheet isOpen={isOpen} onOpenChange={setIsOpen}>
        {children ?? (
          <YStack padding="$4" gap="$3">
            <Paragraph fontWeight="bold" fontSize="$6">
              Sheet Title
            </Paragraph>
            <Paragraph>
              This is the sheet content. You can put anything here.
            </Paragraph>
            <Button onPress={() => setIsOpen(false)}>Close</Button>
          </YStack>
        )}
      </Sheet>
    </YStack>
  );
};

const meta: Meta<typeof Sheet> = {
  title: 'Base/Sheet',
  component: Sheet,
  args: {
    isOpen: false,
    onOpenChange: fn(),
    children: (
      <YStack padding="$4" gap="$3">
        <Paragraph fontWeight="bold">Sheet Content</Paragraph>
        <Paragraph>Sheet body goes here.</Paragraph>
      </YStack>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

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

export const Interactive: Story = {
  render: () => <SheetDemo />,
};

export const InteractiveWithRichContent: Story = {
  render: () => (
    <SheetDemo initialOpen={false}>
      <YStack padding="$4" gap="$4">
        <Paragraph fontWeight="bold" fontSize="$7">
          Confirm Action
        </Paragraph>
        <Paragraph color="$gray10">
          Are you sure you want to proceed with this action? This cannot be
          undone.
        </Paragraph>
        <YStack gap="$2">
          <Button theme="active">Confirm</Button>
          <Button variant="outlined">Cancel</Button>
        </YStack>
      </YStack>
    </SheetDemo>
  ),
};
