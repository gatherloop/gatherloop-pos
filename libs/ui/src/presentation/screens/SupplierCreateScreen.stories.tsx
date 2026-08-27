import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierCreateScreen } from './SupplierCreateScreen';

const meta: Meta<typeof SupplierCreateScreen> = {
  title: 'Screens/Suppliers/SupplierCreateScreen',
  component: SupplierCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SupplierCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { name: '', phone: '', address: '', mapsLink: '' },
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
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
