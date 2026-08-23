import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { YStack } from 'tamagui';
import { FloatingCartButton } from './FloatingCartButton';

const meta: Meta<typeof FloatingCartButton> = {
  title: 'Base/FloatingCartButton',
  component: FloatingCartButton,
  args: {
    label: '3 items · Rp 45.000 · View Cart',
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
type Story = StoryObj<typeof FloatingCartButton>;

export const Default: Story = {};

export const ShortLabel: Story = {
  args: {
    label: '3 tickets · View Cart',
  },
};
