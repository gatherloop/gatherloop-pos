import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductList } from './ProductList';
import { mockProducts } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  searchValue: '',
  saleType: 'all' as const,
  onSearchValueChange: fn(),
  onSaleTypeChange: fn(),
  onRetryButtonPress: fn(),
  onPageChange: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  currentPage: 1,
  totalItem: 3,
  itemPerPage: 10,
};

const meta: Meta<typeof ProductList> = {
  title: 'Features/Products/ProductList',
  component: ProductList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ProductList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockProducts },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
    totalItem: 0,
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};

export const WithSearch: Story = {
  args: {
    variant: { type: 'loaded', items: mockProducts.slice(0, 1) },
    searchValue: 'Coffee',
    totalItem: 1,
  },
};

export const RentalFilter: Story = {
  args: {
    variant: {
      type: 'loaded',
      items: mockProducts.filter((p) => p.saleType === 'rental'),
    },
    saleType: 'rental' as const,
    totalItem: 1,
  },
};
