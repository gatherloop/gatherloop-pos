import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierListScreen } from './SupplierListScreen';
import { mockSuppliers } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onDeleteMenuPress: fn(),
  onOpenMapMenuPress: fn(),
  onEditMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  suppliers: mockSuppliers,
  searchValue: '',
  onSearchValueChange: fn(),
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof SupplierListScreen> = {
  title: 'Screens/Suppliers/SupplierListScreen',
  component: SupplierListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof SupplierListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockSuppliers } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', items: mockSuppliers },
    isDeleteModalOpen: true,
  },
};
