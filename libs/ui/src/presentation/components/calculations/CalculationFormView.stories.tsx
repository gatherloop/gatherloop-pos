import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CalculationFormView } from './CalculationFormView';
import type { CalculationForm } from '../../../domain';

const walletOptions = [
  { label: 'Cash', value: 1 },
  { label: 'Bank Transfer', value: 2 },
  { label: 'QRIS', value: 3 },
];

const defaultValues: CalculationForm = {
  walletId: 1,
  totalWallet: 0,
  calculationItems: [],
};

const meta: Meta<typeof CalculationFormView> = {
  title: 'Features/Calculations/CalculationFormView',
  component: CalculationFormView,
};

export default meta;
type Story = StoryObj<typeof CalculationFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues,
    onSubmit: fn(),
    walletSelectOptions: walletOptions,
    getTotalWallet: (totalWallet) => totalWallet,
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      walletId: 1,
      totalWallet: 5000000,
      calculationItems: [
        { price: 100000, amount: 10 },
        { price: 50000, amount: 20 },
        { price: 20000, amount: 50 },
      ],
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

export const Disabled: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      walletId: 1,
      totalWallet: 5000000,
      calculationItems: [{ price: 100000, amount: 10 }],
    },
    isFormDisabled: true,
  },
};
