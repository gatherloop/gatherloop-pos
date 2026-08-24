import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { RentalCheckoutCartView } from './RentalCheckoutCartView';
import type { RentalCheckoutForm } from '../../../domain';
import { mockRental, mockRentalCheckedOut } from '../../../../.storybook/mocks/mockData';

const emptyValues: RentalCheckoutForm = {
  rentals: [],
};

const populatedValues: RentalCheckoutForm = {
  rentals: [mockRental, mockRentalCheckedOut],
};

const RentalCheckoutCartStory = ({
  defaultValues,
  showGrandTotal,
  serverError,
}: {
  defaultValues: RentalCheckoutForm;
  showGrandTotal?: boolean;
  serverError?: string;
}) => {
  const form = useForm<RentalCheckoutForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });
  return (
    <RentalCheckoutCartView
      rentalsFieldArray={rentalsFieldArray}
      now={new Date('2024-01-20T10:00:00.000Z')}
      showGrandTotal={showGrandTotal}
      serverError={serverError}
    />
  );
};

const meta: Meta<typeof RentalCheckoutCartView> = {
  title: 'Features/Rentals/RentalCheckoutCartView',
  component: RentalCheckoutCartView,
};

export default meta;
type Story = StoryObj<typeof RentalCheckoutCartView>;

export const Empty: Story = {
  render: () => <RentalCheckoutCartStory defaultValues={emptyValues} />,
};

export const OneRental: Story = {
  render: () => (
    <RentalCheckoutCartStory
      defaultValues={{ rentals: [mockRental] }}
    />
  ),
};

export const SeveralRentalsWithTiers: Story = {
  render: () => <RentalCheckoutCartStory defaultValues={populatedValues} />,
};

export const WithoutGrandTotal: Story = {
  render: () => (
    <RentalCheckoutCartStory
      defaultValues={populatedValues}
      showGrandTotal={false}
    />
  ),
};

export const WithServerError: Story = {
  render: () => (
    <RentalCheckoutCartStory
      defaultValues={populatedValues}
      serverError="Failed to submit. Please try again."
    />
  ),
};
