import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { RentalCheckinFormView } from './RentalCheckinFormView';
import type { RentalCheckinForm } from '../../../domain';

const defaultValues: RentalCheckinForm = {
  name: '',
  rentals: [],
  checkinAt: null,
};

const DefaultStory = () => {
  const form = useForm<RentalCheckinForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });
  return (
    <RentalCheckinFormView
      form={form}
      onToggleCustomizeCheckinDateTime={fn()}
      onSubmit={fn()}
      isSubmitDisabled={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<RentalCheckinForm>({
    defaultValues: {
      name: 'John Doe',
      rentals: [],
      checkinAt: { date: 20, month: 1, year: 2024, hour: 8, minute: 0 },
    },
  });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });
  return (
    <RentalCheckinFormView
      form={form}
      onToggleCustomizeCheckinDateTime={fn()}
      onSubmit={fn()}
      isSubmitDisabled={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
    />
  );
};

const meta: Meta<typeof RentalCheckinFormView> = {
  title: 'Features/Rentals/RentalCheckinFormView',
  component: RentalCheckinFormView,
};

export default meta;
type Story = StoryObj<typeof RentalCheckinFormView>;

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};
