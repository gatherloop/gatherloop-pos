import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { RentalCheckoutScreen } from './RentalCheckoutScreen';
import type { RentalCheckoutForm } from '../../domain';
import { mockRentals } from '../../../.storybook/mocks/mockData';

const defaultValues: RentalCheckoutForm = { rentals: [] };

const CheckoutStory = () => {
  return (
    <RentalCheckoutScreen
      variant={{ type: 'loaded' }}
      defaultValues={defaultValues}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={false}
      onLogoutPress={fn()}
      rentalList={{
        searchValue: '',
        onSearchValueChange: fn(),
        checkoutStatus: 'ongoing' as const,
        onCheckoutStatusChange: fn(),
        variant: { type: 'loaded' },
        rentals: mockRentals.filter((r) => !r.checkoutAt),
        currentPage: 1,
        onPageChange: fn(),
        totalItem: 1,
        itemPerPage: 10,
        onRetryButtonPress: fn(),
        onItemPress: fn(),
        isSearchAutoFocus: true,
      }}
    />
  );
};

const meta: Meta<typeof RentalCheckoutScreen> = {
  title: 'Screens/Rentals/RentalCheckoutScreen',
  component: RentalCheckoutScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RentalCheckoutScreen>;

export const Default: Story = { render: () => <CheckoutStory /> };
