import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialListItem } from './MaterialListItem';

const meta: Meta<typeof MaterialListItem> = {
  title: 'Features/Materials/MaterialListItem',
  component: MaterialListItem,
  args: {
    name: 'Coffee Bean',
    price: 80000,
    unit: 'Gram',
    weeklyUsage: 395,
    purchaseUnit: 'Kg',
    minimumStock: 1,
    normalStock: 2,
    supplierName: 'PT. Coffee Supplier',
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

export const WithoutSupplier: Story = {
  args: {
    supplierName: undefined,
  },
};

export const HighUsage: Story = {
  args: {
    name: 'Fresh Milk',
    price: 15000,
    unit: 'Liter',
    weeklyUsage: 50,
    purchaseUnit: 'Liter',
    minimumStock: 5,
    normalStock: 10,
    supplierName: 'Dairy Farm Co.',
  },
};

export const LowUsage: Story = {
  args: {
    name: 'Sugar',
    price: 12000,
    unit: 'Gram',
    weeklyUsage: 10,
    purchaseUnit: 'Kg',
    minimumStock: 2,
    normalStock: 5,
  },
};
