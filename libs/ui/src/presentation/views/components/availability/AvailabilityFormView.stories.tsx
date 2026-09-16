import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AvailabilityProduct } from '../../../../domain';
import { toAvailabilityUpdateForm } from '../../../../utils';
import { AvailabilityFormView } from './AvailabilityFormView';

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
  {
    productId: 3,
    productName: 'Pancong',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'product',
    isAvailable: true,
    availableQuantity: 5,
    isSellable: true,
    sellableQuantity: 5,
    variants: [
      { variantId: 6, variantName: 'Choco', isAvailable: true, isSellable: true },
      { variantId: 7, variantName: 'Matcha', isAvailable: true, isSellable: true },
      { variantId: 8, variantName: 'Vanilla', isAvailable: true, isSellable: true },
    ],
  },
];

const negativeQuantityProducts: AvailabilityProduct[] = [
  {
    ...products[2],
    availableQuantity: -2,
    isSellable: false,
    sellableQuantity: 0,
    variants: products[2].variants.map((variant) => ({
      ...variant,
      isSellable: false,
      sellableQuantity: 0,
    })),
  },
  products[0],
  products[1],
];

const soldOutProducts: AvailabilityProduct[] = [
  {
    productId: 9,
    productName: 'Kopi Tubruk',
    categoryId: 1,
    categoryName: 'Minuman',
    availabilityTracking: 'none',
    isAvailable: false,
    isSellable: false,
    variants: [
      { variantId: 9, variantName: 'Reguler', isAvailable: false, isSellable: false },
    ],
  },
  ...products,
];

const meta: Meta<typeof AvailabilityFormView> = {
  title: 'Components/Availability/AvailabilityFormView',
  component: AvailabilityFormView,
};

export default meta;
type Story = StoryObj<typeof AvailabilityFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    products,
    defaultValues: toAvailabilityUpdateForm(products),
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Empty: Story = {
  args: {
    ...Loaded.args,
    products: [],
    defaultValues: { products: [], variants: [] },
  },
};

export const ErrorState: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};

export const NegativeQuantity: Story = {
  args: {
    ...Loaded.args,
    products: negativeQuantityProducts,
    defaultValues: toAvailabilityUpdateForm(negativeQuantityProducts),
  },
};

export const SoldOutRow: Story = {
  args: {
    ...Loaded.args,
    products: soldOutProducts,
    defaultValues: toAvailabilityUpdateForm(soldOutProducts),
  },
};
