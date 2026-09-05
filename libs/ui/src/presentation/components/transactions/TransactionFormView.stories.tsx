import type { Meta, StoryObj } from '@storybook/react';
import { fn, screen, userEvent, within } from '@storybook/test';
import React from 'react';
import { Text } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { TransactionForm } from '../../../domain';
import { mockVariants } from '../../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
};

const filledValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [
    {
      id: 1,
      variant: mockVariants[0],
      amount: 2,
      price: 35000,
      discountAmount: 0,
      note: '',
    },
  ],
  transactionCoupons: [],
};

const TransactionFormStory = ({
  values = defaultValues,
}: {
  values?: TransactionForm;
} = {}) => (
  <TransactionFormView
    variant={{ type: 'loaded' }}
    defaultValues={values}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
    TransactionCouponList={() => null}
  />
);

const CouponSheetOpenStory = () => (
  <TransactionFormView
    variant={{ type: 'loaded' }}
    defaultValues={filledValues}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
    TransactionCouponList={() => <Text color="$color">Coupon List Here</Text>}
  />
);

// PRD FR-5: on compact, applying a coupon swaps the cart sheet's own content
// to the coupon list with a back header, instead of opening a second sheet.
const CompactCouponSwapStory = () => (
  <TransactionFormView
    variant={{ type: 'loaded' }}
    defaultValues={filledValues}
    onSubmit={fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
    TransactionCouponList={() => (
      <Text color="$color">Coupon List Here</Text>
    )}
  />
);

const meta: Meta<typeof TransactionFormView> = {
  title: 'Features/Transactions/TransactionFormView',
  component: TransactionFormView,
};

export default meta;
type Story = StoryObj<typeof TransactionFormView>;

export const Default: Story = {
  render: () => <TransactionFormStory />,
};

export const Loading: Story = {
  render: () => (
    <TransactionFormView
      variant={{ type: 'loading' }}
      defaultValues={defaultValues}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={false}
      TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
      TransactionCouponList={() => null}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <TransactionFormView
      variant={{ type: 'error', onRetryButtonPress: fn() }}
      defaultValues={defaultValues}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={false}
      TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
      TransactionCouponList={() => null}
    />
  ),
};

export const CouponSheetOpen: Story = {
  render: () => <CouponSheetOpenStory />,
};

// Compact layout (PRD FR-3): at ≤800px the picker fills the screen and the
// cart moves into a sheet behind a floating button.
export const CompactEmptyCart: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <TransactionFormStory />,
};

export const CompactWithItems: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <TransactionFormStory values={filledValues} />,
};

export const CompactCouponSheetOpen: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactCouponSwapStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText(/View Cart/));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Apply Coupon' })
    );
  },
};
