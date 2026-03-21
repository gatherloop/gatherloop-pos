import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductListScreen } from './ProductListScreen';
import { mockProducts } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  currentPage: 1,
  itemPerPage: 10,
  totalItem: 3,
  onPageChange: fn(),
  onRetryButtonPress: fn(),
  onSaleTypeChange: fn(),
  onSearchValueChange: fn(),
  saleType: 'all' as const,
  searchValue: '',
  isDeleteButtonDisabled: false,
  isDeleteModalOpen: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof ProductListScreen> = {
  title: 'Screens/Products/ProductListScreen',
  component: ProductListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ProductListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockProducts } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' }, totalItem: 0 },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', items: mockProducts },
    isDeleteModalOpen: true,
  },
};
