import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AvailabilityProduct } from '../../../../domain';
import { toAvailabilityUpdateForm } from '../../../../utils';
import { AvailabilityScreen } from './AvailabilityScreen';

const products: AvailabilityProduct[] = [
  {
    productId: 1,
    productName: 'Es Kopi Susu',
    categoryId: 1,
    categoryName: 'Minuman',
    availabilityTracking: 'none',
    isAvailable: true,
    isSellable: true,
    variants: [
      { variantId: 1, variantName: 'Vanilla', isAvailable: false, isSellable: false },
      { variantId: 2, variantName: 'Banana', isAvailable: true, isSellable: true },
      { variantId: 3, variantName: 'Hazelnut', isAvailable: true, isSellable: true },
    ],
  },
  {
    productId: 2,
    productName: 'Soft Cookies',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'variant',
    isAvailable: true,
    isSellable: true,
    sellableQuantity: 9,
    variants: [
      {
        variantId: 4,
        variantName: 'Choco',
        isAvailable: true,
        availableQuantity: 6,
        isSellable: true,
        sellableQuantity: 6,
      },
      {
        variantId: 5,
        variantName: 'Red Velvet',
        isAvailable: true,
        availableQuantity: 3,
        isSellable: true,
        sellableQuantity: 3,
      },
    ],
  },
];

const meta: Meta<typeof AvailabilityScreen> = {
  title: 'Screens/POS/AvailabilityScreen',
  component: AvailabilityScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AvailabilityScreen>;

export const Default: Story = {
  args: {
    variant: { type: 'loaded' },
    products,
    defaultValues: toAvailabilityUpdateForm(products),
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    variant: { type: 'loading' },
  },
};

export const Error: Story = {
  args: {
    ...Default.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
  },
};
