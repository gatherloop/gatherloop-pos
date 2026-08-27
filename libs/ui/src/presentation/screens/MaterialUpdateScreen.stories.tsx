import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialUpdateScreen } from './MaterialUpdateScreen';
import type { MaterialForm } from '../../domain';

const defaultValues: MaterialForm = {
  name: 'Coffee Bean',
  price: 80000,
  unit: 'kg',
  description: 'Premium Arabica coffee beans',
  purchaseUnit: 'Kg',
  purchaseUnitSize: 1000,
  minimumStock: 5,
  normalStock: 10,
  isStockCheckRequired: true,
  suppliers: [],
};

const meta: Meta<typeof MaterialUpdateScreen> = {
  title: 'Screens/Materials/MaterialUpdateScreen',
  component: MaterialUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MaterialUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues,
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    suppliers: [],
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    defaultValues: { ...defaultValues, name: '' },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
