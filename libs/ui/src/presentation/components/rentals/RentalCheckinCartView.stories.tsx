import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import { RentalCheckinCartView } from './RentalCheckinCartView';
import type { RentalCheckinForm } from '../../../domain';
import { mockTickets, mockVariant } from '../../../../.storybook/mocks/mockData';

const emptyValues: RentalCheckinForm = {
  name: '',
  rentals: [],
  checkinAt: null,
};

const populatedValues: RentalCheckinForm = {
  name: 'John Doe',
  rentals: [
    { code: mockTickets[0].code, variant: mockVariant },
    { code: '0xDEADBEEF', variant: mockVariant },
    { code: '', variant: mockVariant },
  ],
  checkinAt: { date: 20, month: 1, year: 2024, hour: 8, minute: 0 },
};

const RentalCheckinCartStory = ({
  defaultValues,
  serverError,
}: {
  defaultValues: RentalCheckinForm;
  serverError?: string;
}) => {
  const form = useForm<RentalCheckinForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'rentals',
    keyName: 'key',
  });
  return (
    <FormProvider {...form}>
      <RentalCheckinCartView
        form={form}
        rentalsFieldArray={rentalsFieldArray}
        tickets={mockTickets}
        onToggleCustomizeCheckinDateTime={fn()}
        serverError={serverError}
      />
    </FormProvider>
  );
};

const meta: Meta<typeof RentalCheckinCartView> = {
  title: 'Features/Rentals/RentalCheckinCartView',
  component: RentalCheckinCartView,
};

export default meta;
type Story = StoryObj<typeof RentalCheckinCartView>;

export const Empty: Story = {
  render: () => <RentalCheckinCartStory defaultValues={emptyValues} />,
};

export const WithTickets: Story = {
  render: () => <RentalCheckinCartStory defaultValues={populatedValues} />,
};

export const WithServerError: Story = {
  render: () => (
    <RentalCheckinCartStory
      defaultValues={emptyValues}
      serverError="Failed to submit. Please try again."
    />
  ),
};

// Compact layout (PRD FR-3): the datetime selects wrap instead of dividing
// a narrow sheet width five ways.
export const CompactWithDatetime: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <RentalCheckinCartStory defaultValues={populatedValues} />,
};
