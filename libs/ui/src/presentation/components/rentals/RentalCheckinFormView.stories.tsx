import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { RentalCheckinFormView } from './RentalCheckinFormView';
import type { RentalCheckinForm } from '../../../domain';
import { mockTickets, mockVariant } from '../../../../.storybook/mocks/mockData';

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
      isSubmitting={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
      tickets={mockTickets}
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
      isSubmitting={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
      tickets={mockTickets}
    />
  );
};

const ScanResolutionStory = () => {
  const form = useForm<RentalCheckinForm>({
    defaultValues: {
      name: 'John Doe',
      rentals: [
        { code: mockTickets[0].code, variant: mockVariant },
        { code: '0xDEADBEEF', variant: mockVariant },
        { code: '', variant: mockVariant },
      ],
      checkinAt: null,
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
      isSubmitting={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
      tickets={mockTickets}
    />
  );
};

// Compact layout (PRD FR-3): at ≤800px the picker fills the screen and the
// cart moves behind a floating button into a sheet.
const CompactWithTicketsStory = () => {
  const form = useForm<RentalCheckinForm>({
    defaultValues: {
      name: '',
      rentals: [
        { code: '', variant: mockVariant },
        { code: '', variant: mockVariant },
      ],
      checkinAt: null,
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
      isSubmitting={false}
      RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
      rentalsFieldArray={rentalsFieldArray}
      tickets={mockTickets}
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

export const ScanResolution: Story = {
  render: () => <ScanResolutionStory />,
};

export const CompactEmptyCart: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <DefaultStory />,
};

export const CompactWithTickets: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactWithTicketsStory />,
};

export const CompactCartSheetOpen: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactWithTicketsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/View Cart/));
  },
};
