import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierUpdateScreen } from './SupplierUpdateScreen';

const meta: Meta<typeof SupplierUpdateScreen> = {
  title: 'Screens/Suppliers/SupplierUpdateScreen',
  component: SupplierUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SupplierUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: {
      name: 'PT. Kopi Nusantara',
      phone: '+6281234567890',
      address: 'Jl. Raya No. 1, Jakarta Selatan',
      mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
    },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    defaultValues: { name: '', phone: '', address: '', mapsLink: '' },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
