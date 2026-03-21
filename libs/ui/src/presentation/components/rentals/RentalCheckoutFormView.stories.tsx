import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { RentalCheckoutFormView } from './RentalCheckoutFormView';
import type { RentalCheckoutForm } from '../../../domain';

const defaultValues: RentalCheckoutForm = {
  rentals: [],
};

const DefaultStory = () => {
  const form = useForm<RentalCheckoutForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });
  return (
    <RentalCheckoutFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
    />
  );
};

const meta: Meta<typeof RentalCheckoutFormView> = {
  title: 'Features/Rentals/RentalCheckoutFormView',
  component: RentalCheckoutFormView,
};

export default meta;
type Story = StoryObj<typeof RentalCheckoutFormView>;

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const SubmitDisabled: Story = {
  render: () => {
    const form = useForm<RentalCheckoutForm>({ defaultValues });
    const rentalsFieldArray = useFieldArray({
      control: form.control,
      name: 'rentals',
      keyName: 'key',
    });
    return (
      <RentalCheckoutFormView
        form={form}
        onSubmit={fn()}
        isSubmitDisabled={true}
        RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
        rentalsFieldArray={rentalsFieldArray}
      />
    );
  },
};
