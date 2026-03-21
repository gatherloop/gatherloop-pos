import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RentalListScreen } from './RentalListScreen';
import { mockRentals } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onDeleteMenuPress: fn(),
  onRetryButtonPress: fn(),
  rentals: mockRentals,
  searchValue: '',
  onSearchValueChange: fn(),
  checkoutStatus: 'all' as const,
  onCheckoutStatusChange: fn(),
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof RentalListScreen> = {
  title: 'Screens/Rentals/RentalListScreen',
  component: RentalListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof RentalListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded' } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded' },
    isDeleteModalOpen: true,
  },
};
