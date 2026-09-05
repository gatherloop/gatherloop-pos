import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import React from 'react';
import { Text } from 'tamagui';
import { RentalCheckoutFormView } from './RentalCheckoutFormView';
import type { RentalCheckoutForm } from '../../../domain';
import { mockRental, mockRentalCheckedOut } from '../../../../.storybook/mocks/mockData';

const defaultValues: RentalCheckoutForm = {
  rentals: [],
};

const DefaultStory = () => (
  <RentalCheckoutFormView
    variant={{ type: 'loaded' }}
    defaultValues={defaultValues}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
  />
);

// Compact layout (PRD FR-2): at ≤800px the picker fills the screen and the
// cart moves behind a floating button into a sheet.
const CompactWithRentalsStory = () => (
  <RentalCheckoutFormView
    variant={{ type: 'loaded' }}
    defaultValues={{ rentals: [mockRental, mockRentalCheckedOut] }}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
  />
);

const meta: Meta<typeof RentalCheckoutFormView> = {
  title: 'Features/Rentals/RentalCheckoutFormView',
  component: RentalCheckoutFormView,
};

export default meta;
type Story = StoryObj<typeof RentalCheckoutFormView>;

export const Default: Story = {
  render: () => <DefaultStory />,
};

const SubmitDisabledStory = () => (
  <RentalCheckoutFormView
    variant={{ type: 'loaded' }}
    defaultValues={defaultValues}
    onSubmit={fn()}
    isSubmitDisabled={true}
    isSubmitting={false}
    isSubmitSuccess={false}
    RentalItemSelect={() => <Text color="$color">+ Add Rental Item</Text>}
  />
);

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
    // `findByText`, not `getByText`: Storybook applies this story's `mobile`
    // viewport by resizing the preview iframe, and that resize lands after
    // `play` starts. A synchronous query runs while the iframe is still full
    // width, where the compact cart bar does not exist.
    await userEvent.click(await canvas.findByText(/View Cart/));
  },
};
