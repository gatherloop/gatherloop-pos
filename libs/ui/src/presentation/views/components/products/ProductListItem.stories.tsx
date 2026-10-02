import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductListItem } from './ProductListItem';
import type { ProductTag, Tag } from '../../../../domain';

const buildTag = (
  id: number,
  name: string,
  color: Tag['color'],
  sortOrder: number
): Tag => ({
  id,
  name,
  color,
  isHighlighted: true,
  sortOrder,
  variantCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const buildProductTag = (
  tag: Tag,
  scope: ProductTag['scope'],
  variantIds: number[]
): ProductTag => ({
  tag,
  scope,
  variantIds,
  taggedAt: '2024-01-01T00:00:00.000Z',
});

const bestSeller = buildTag(1, 'Best Seller', 'orange', 1);
const newTag = buildTag(2, 'New', 'green', 2);
const spicy = buildTag(3, 'Spicy', 'red', 3);

const meta: Meta<typeof ProductListItem> = {
  title: 'Components/Products/ProductListItem',
  component: ProductListItem,
  args: {
    name: 'Iced Coffee Latte',
    categoryName: 'Beverages',
    saleType: 'purchase',
    status: 'published',
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

export const DraftStatus: Story = {
  args: {
    name: 'Experimental Matcha Latte',
    status: 'draft',
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

export const SoldOut: Story = {
  args: {
    name: 'Es Kopi Susu Vanilla',
    isSoldOut: true,
  },
};

export const LowRemainingQuantity: Story = {
  args: {
    name: 'Pancong',
    remainingQuantity: 2,
  },
};

export const WithProductScopeTag: Story = {
  args: {
    name: 'Coffee Latte',
    tags: [buildProductTag(bestSeller, 'product', [1, 2])],
  },
};

export const WithVariantScopeTag: Story = {
  args: {
    name: 'Pancong',
    tags: [buildProductTag(newTag, 'variant', [10])],
    variantNameById: { 10: 'Ice Cream' },
  },
};

export const WithTagOverflow: Story = {
  args: {
    name: 'Pancong',
    remainingQuantity: 2,
    tags: [
      buildProductTag(bestSeller, 'product', [1, 2]),
      buildProductTag(newTag, 'variant', [10]),
      buildProductTag(spicy, 'product', [1, 2]),
    ],
    variantNameById: { 10: 'Ice Cream' },
  },
};
