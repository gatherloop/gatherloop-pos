import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialFormView } from './MaterialFormView';
import type { MaterialForm } from '../../../domain';

const defaultValues: MaterialForm = {
  name: '',
  price: 0,
  unit: '',
  description: '',
  purchaseUnit: '',
  purchaseUnitSize: 1,
  minimumStock: 0,
  normalStock: 0,
  isStockCheckRequired: true,
  suppliers: [],
};

const meta: Meta<typeof MaterialFormView> = {
  title: 'Features/Materials/MaterialFormView',
  component: MaterialFormView,
};

export default meta;
type Story = StoryObj<typeof MaterialFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues,
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    suppliers: [],
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      ...defaultValues,
      name: 'Coffee Bean',
      price: 80000,
      unit: 'kg',
      description: 'Premium Arabica coffee beans',
      purchaseUnit: 'Kg',
      purchaseUnitSize: 1000,
      minimumStock: 5,
      normalStock: 10,
    },
  },
};

export const ExcludedFromStockCheck: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      ...defaultValues,
      name: 'Cleaning Cloth',
      price: 5000,
      unit: 'pcs',
      isStockCheckRequired: false,
    },
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};

export const SubmitDisabled: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
  },
};
