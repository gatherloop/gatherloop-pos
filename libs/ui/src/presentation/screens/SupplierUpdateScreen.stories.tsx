import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { SupplierUpdateScreen } from './SupplierUpdateScreen';
import type { SupplierForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<SupplierForm>({
    defaultValues: {
      name: 'PT. Kopi Nusantara',
      phone: '+6281234567890',
      address: 'Jl. Raya No. 1, Jakarta Selatan',
      mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
    },
  });
  return (
    <SupplierUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof SupplierUpdateScreen> = {
  title: 'Screens/Suppliers/SupplierUpdateScreen',
  component: SupplierUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SupplierUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
