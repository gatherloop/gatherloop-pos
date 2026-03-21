import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialListItem } from './MaterialListItem';

const meta: Meta<typeof MaterialListItem> = {
  title: 'Features/Materials/MaterialListItem',
  component: MaterialListItem,
  args: {
    name: 'Steel',
    price: 50000,
    unit: 'kg',
    weeklyUsage: 10,
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
    name: 'Cotton Fabric',
    price: 20000,
    unit: 'meter',
    weeklyUsage: 250,
  },
};

export const LowUsage: Story = {
  args: {
    name: 'Aluminum Sheet',
    price: 35000,
    unit: 'sheet',
    weeklyUsage: 2,
  },
};
