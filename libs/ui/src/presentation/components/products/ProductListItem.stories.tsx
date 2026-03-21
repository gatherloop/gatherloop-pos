import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductListItem } from './ProductListItem';

const meta: Meta<typeof ProductListItem> = {
  title: 'Features/Products/ProductListItem',
  component: ProductListItem,
  args: {
    name: 'iPhone 14',
    categoryName: 'Electronics',
    saleType: 'purchase',
    imageUrl: 'https://placehold.jp/120x120.png',
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProductListItem>;

export const Default: Story = {};

export const RentalType: Story = {
  args: {
    name: 'Drone DJI Mini 3',
    categoryName: 'Electronics',
    saleType: 'rental',
    imageUrl: 'https://placehold.jp/120x120.png',
  },
};

export const WithoutImage: Story = {
  args: {
    imageUrl: undefined,
  },
};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};

export const LongName: Story = {
  args: {
    name: 'Samsung Galaxy S23 Ultra 5G Special Edition Premium Bundle',
    categoryName: 'Mobile Phones & Accessories',
  },
};
