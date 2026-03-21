import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialListItem } from './MaterialListItem';

const meta: Meta<typeof MaterialListItem> = {
  title: 'Features/Materials/MaterialListItem',
  component: MaterialListItem,
  args: {
    name: 'Coffee Bean',
    price: 80000,
    unit: 'kg',
    weeklyUsage: 20,
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MaterialListItem>;

export const Default: Story = {};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};

export const HighUsage: Story = {
  args: {
    name: 'Fresh Milk',
    price: 15000,
    unit: 'liter',
    weeklyUsage: 50,
  },
};

export const LowUsage: Story = {
  args: {
    name: 'Sugar',
    price: 12000,
    unit: 'kg',
    weeklyUsage: 10,
  },
};
