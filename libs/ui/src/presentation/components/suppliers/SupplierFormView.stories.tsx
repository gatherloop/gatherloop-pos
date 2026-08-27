import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierFormView } from './SupplierFormView';

const meta: Meta<typeof SupplierFormView> = {
  title: 'Features/Suppliers/SupplierFormView',
  component: SupplierFormView,
};

export default meta;
type Story = StoryObj<typeof SupplierFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { name: '', phone: '', address: '', mapsLink: '' },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      name: 'PT. Kopi Nusantara',
      phone: '+6281234567890',
      address: 'Jl. Raya No. 1, Jakarta Selatan',
      mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
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

export const Submitting: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
