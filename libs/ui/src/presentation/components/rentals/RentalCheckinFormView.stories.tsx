import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import React from 'react';
import { Text } from 'tamagui';
import { RentalCheckinFormView } from './RentalCheckinFormView';
import type { RentalCheckinForm } from '../../../domain';
import { mockTickets, mockVariant } from '../../../../.storybook/mocks/mockData';

const emptyValues: RentalCheckinForm = {
  name: '',
  rentals: [],
  checkinAt: null,
};

const DefaultStory = () => (
  <RentalCheckinFormView
    variant={{ type: 'loaded' }}
    defaultValues={emptyValues}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
    tickets={mockTickets}
  />
);

const PopulatedStory = () => (
  <RentalCheckinFormView
    variant={{ type: 'loaded' }}
    defaultValues={{
      name: 'John Doe',
      rentals: [],
      checkinAt: { date: 20, month: 1, year: 2024, hour: 8, minute: 0 },
    }}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
    tickets={mockTickets}
  />
);

const ScanResolutionStory = () => (
  <RentalCheckinFormView
    variant={{ type: 'loaded' }}
    defaultValues={{
      name: 'John Doe',
      rentals: [
        { code: mockTickets[0].code, variant: mockVariant },
        { code: '0xDEADBEEF', variant: mockVariant },
        { code: '', variant: mockVariant },
      ],
      checkinAt: null,
    }}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
    tickets={mockTickets}
  />
);

// Compact layout (PRD FR-3): at ≤800px the picker fills the screen and the
// cart moves behind a floating button into a sheet.
const CompactWithTicketsStory = () => (
  <RentalCheckinFormView
    variant={{ type: 'loaded' }}
    defaultValues={{
      name: '',
      rentals: [
        { code: '', variant: mockVariant },
        { code: '', variant: mockVariant },
      ],
      checkinAt: null,
    }}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
    tickets={mockTickets}
  />
);

// Phase 4 keyboard-ergonomics check: 12 rows is enough for the sheet body
// to scroll well past one screen, so the focus chain and its scroll-into-
// view behaviour have somewhere to prove themselves (PRD Phase 4, "verified
// ... with a list long enough to scroll").
const CompactWithManyTicketsStory = () => (
  <RentalCheckinFormView
    variant={{ type: 'loaded' }}
    defaultValues={{
      name: '',
      rentals: Array.from({ length: 12 }, () => ({
        code: '',
        variant: mockVariant,
      })),
      checkinAt: null,
    }}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
    tickets={mockTickets}
  />
);

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

export const CompactCartSheetLongList: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactWithManyTicketsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/View Cart/));
  },
};
