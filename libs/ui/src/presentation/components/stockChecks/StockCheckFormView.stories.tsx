import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { StockCheckFormView } from './StockCheckFormView';

const meta: Meta<typeof StockCheckFormView> = {
  title: 'Features/StockChecks/StockCheckFormView',
  component: StockCheckFormView,
};

export default meta;
type Story = StoryObj<typeof StockCheckFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: {
      items: [
        {
          materialId: 1,
          materialName: 'Botol Kaca Bening 250 ml',
          purchaseUnit: 'Dus (24 Pcs)',
          currentStock: 12,
        },
        {
          materialId: 2,
          materialName: 'Baking Soda',
          purchaseUnit: 'PCS (15 Gram)',
          currentStock: null,
        },
      ],
    },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
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

export const Submitting: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
