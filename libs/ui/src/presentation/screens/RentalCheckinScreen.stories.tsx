import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { RentalCheckinScreen } from './RentalCheckinScreen';
import type { RentalCheckinForm } from '../../domain';
import { mockProducts } from '../../../.storybook/mocks/mockData';

const defaultValues: RentalCheckinForm = {
  name: '',
  rentals: [],
  checkinAt: null,
};

const CheckinStory = () => {
  const form = useForm<RentalCheckinForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({ control: form.control, name: 'rentals', keyName: 'key' });

  return (
    <RentalCheckinScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      rentalsFieldArray={rentalsFieldArray}
      onToggleCustomizeCheckinDateTime={fn()}
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
};

const meta: Meta<typeof RentalCheckinScreen> = {
  title: 'Screens/Rentals/RentalCheckinScreen',
  component: RentalCheckinScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RentalCheckinScreen>;

export const Default: Story = { render: () => <CheckinStory /> };
