import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from 'tamagui';
import { Plus } from '@tamagui/lucide-icons';
import { Navbar } from './Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Base/Navbar',
  component: Navbar,
  args: {
    title: 'Page Title',
    showBackButton: false,
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const Default: Story = {};

export const WithBackButton: Story = {
  args: {
    title: 'Product Detail',
    showBackButton: true,
  },
};

export const WithRightAction: Story = {
  args: {
    title: 'Products',
    rightActionItem: (
      <Button icon={Plus} onPress={fn()} size="$3">
        Add Product
      </Button>
    ),
  },
};

export const WithBackButtonAndRightAction: Story = {
  args: {
    title: 'Edit Product',
    showBackButton: true,
    rightActionItem: (
      <Button icon={Plus} onPress={fn()} size="$3">
        Save
      </Button>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'This is a Very Long Page Title That Might Overflow',
  },
};
