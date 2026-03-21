import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RentalListItem } from './RentalListItem';

const meta: Meta<typeof RentalListItem> = {
  title: 'Features/Rentals/RentalListItem',
  component: RentalListItem,
  args: {
    code: 'RNT-001',
    name: 'John Doe',
    variantName: 'Coffee Equipment Set - Standard Package',
    checkinAt: '2024-01-20T08:00:00.000Z',
    checkoutAt: undefined,
    onDeleteMenuPress: fn(),
    onItemPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RentalListItem>;

export const Ongoing: Story = {};

export const CheckedOut: Story = {
  args: {
    name: 'Jane Smith',
    code: 'RNT-002',
    checkoutAt: '2024-01-21T17:00:00.000Z',
  },
};

export const WithoutMenus: Story = {
  args: {
    onDeleteMenuPress: undefined,
    onItemPress: undefined,
  },
};
