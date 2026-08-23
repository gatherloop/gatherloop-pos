import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { YStack } from 'tamagui';
import { TransactionCartButton } from './TransactionCartButton';

const meta: Meta<typeof TransactionCartButton> = {
  title: 'Features/Transactions/TransactionCartButton',
  component: TransactionCartButton,
  args: {
    itemCount: 3,
    total: 45000,
    onPress: fn(),
  },
  decorators: [
    (Story) => (
      <YStack height={200} position="relative" backgroundColor="$gray2">
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TransactionCartButton>;

export const Default: Story = {};

export const SingleItem: Story = {
  args: {
    itemCount: 1,
    total: 15000,
  },
};
