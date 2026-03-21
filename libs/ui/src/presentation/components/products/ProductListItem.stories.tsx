import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductListItem } from './ProductListItem';

const meta: Meta<typeof ProductListItem> = {
  title: 'Features/Products/ProductListItem',
  component: ProductListItem,
  args: {
    name: 'Iced Coffee Latte',
    categoryName: 'Beverages',
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
    name: 'Coffee Equipment Set',
    categoryName: 'Merchandise',
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
    name: 'Arabica Single Origin Hand Drip Coffee Special Edition Bundle',
    categoryName: 'Specialty Beverages & Artisan Coffee',
  },
};
