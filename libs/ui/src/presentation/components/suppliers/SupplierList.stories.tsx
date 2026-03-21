import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierList } from './SupplierList';
import { mockSuppliers } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  searchValue: '',
  onSearchValueChange: fn(),
  onRetryButtonPress: fn(),
  onPageChange: fn(),
  onOpenMapMenuPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  currentPage: 1,
  totalItem: 2,
  itemPerPage: 10,
};

const meta: Meta<typeof SupplierList> = {
  title: 'Features/Suppliers/SupplierList',
  component: SupplierList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof SupplierList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockSuppliers },
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
    variant: { type: 'loaded', items: mockSuppliers.slice(0, 1) },
    searchValue: 'PT. Supplier',
    totalItem: 1,
  },
};
