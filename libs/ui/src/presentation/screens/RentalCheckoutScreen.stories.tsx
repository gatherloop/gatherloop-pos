import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { RentalCheckoutScreen } from './RentalCheckoutScreen';
import type { RentalCheckoutForm } from '../../domain';
import { mockRentals } from '../../../.storybook/mocks/mockData';

const defaultValues: RentalCheckoutForm = { rentals: [] };

const CheckoutStory = () => {
  const form = useForm<RentalCheckoutForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({ control: form.control, name: 'rentals', keyName: 'key' });

  return (
    <RentalCheckoutScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      rentalsFieldArray={rentalsFieldArray}
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
