import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { RentalCheckoutFormView } from './RentalCheckoutFormView';
import type { RentalCheckoutForm } from '../../../domain';
import { mockRental, mockRentalCheckedOut } from '../../../../.storybook/mocks/mockData';

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
      isSubmitting={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
    />
  );
};

// Compact layout (PRD FR-2): at ≤800px the picker fills the screen and the
// cart moves behind a floating button into a sheet.
const CompactWithRentalsStory = () => {
  const form = useForm<RentalCheckoutForm>({
    defaultValues: { rentals: [mockRental, mockRentalCheckedOut] },
  });
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
      isSubmitting={false}
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

const SubmitDisabledStory = () => {
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
      isSubmitting={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
    />
  );
};

export const SubmitDisabled: Story = {
  render: () => <SubmitDisabledStory />,
};

export const CompactEmptyCart: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <DefaultStory />,
};

export const CompactWithRentals: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactWithRentalsStory />,
};

export const CompactCartSheetOpen: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactWithRentalsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/View Cart/));
  },
};
