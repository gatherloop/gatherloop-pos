import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RentalList } from './RentalList';
import { mockRentals } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  searchValue: '',
  onSearchValueChange: fn(),
  checkoutStatus: 'all' as const,
  onCheckoutStatusChange: fn(),
  rentals: mockRentals,
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  onRetryButtonPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof RentalList> = {
  title: 'Features/Rentals/RentalList',
  component: RentalList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof RentalList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
    rentals: [],
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
    rentals: [],
  },
};

export const OngoingFilter: Story = {
  args: {
    variant: { type: 'loaded' },
    checkoutStatus: 'ongoing' as const,
    rentals: mockRentals.filter((r) => r.checkoutAt === null),
    totalItem: 1,
  },
};

export const CompletedFilter: Story = {
  args: {
    variant: { type: 'loaded' },
    checkoutStatus: 'completed' as const,
    rentals: mockRentals.filter((r) => r.checkoutAt !== null),
    totalItem: 1,
  },
};
