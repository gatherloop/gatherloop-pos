import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialCreateScreen } from './MaterialCreateScreen';
import type { MaterialForm } from '../../domain';

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

const meta: Meta<typeof MaterialCreateScreen> = {
  title: 'Screens/Materials/MaterialCreateScreen',
  component: MaterialCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MaterialCreateScreen>;

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

export const Populated: Story = {
  args: {
    ...Default.args,
    defaultValues: {
      ...defaultValues,
      name: 'Coffee Bean',
      price: 80000,
      unit: 'kg',
      description: 'Premium Arabica coffee beans',
    },
  },
};
