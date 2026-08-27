import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { RentalCheckinScreen } from './RentalCheckinScreen';
import type { RentalCheckinForm } from '../../domain';
import { mockProducts, mockTickets } from '../../../.storybook/mocks/mockData';

const defaultValues: RentalCheckinForm = {
  name: '',
  rentals: [],
  checkinAt: null,
};

const CheckinStory = () => (
  <RentalCheckinScreen
    variant={{ type: 'loaded' }}
    defaultValues={defaultValues}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    onLogoutPress={fn()}
    tickets={mockTickets}
    rentalItemSelect={{
      amount: 1,
      currentPage: 1,
      itemPerPage: 10,
      onAmountChange: fn(),
      onOptionValuesChange: fn(),
      onPageChange: fn(),
      onRetryButtonPress: fn(),
      onSearchValueChange: fn(),
      onSelectProduct: fn(),
      onSubmit: fn(),
      onUnselectProduct: fn(),
      products: mockProducts,
      searchValue: '',
      selectedOptionValues: [],
      totalItem: mockProducts.length,
      variant: { type: 'loaded' },
    }}
  />
);

const meta: Meta<typeof RentalCheckinScreen> = {
  title: 'Screens/Rentals/RentalCheckinScreen',
  component: RentalCheckinScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RentalCheckinScreen>;

export const Default: Story = { render: () => <CheckinStory /> };
