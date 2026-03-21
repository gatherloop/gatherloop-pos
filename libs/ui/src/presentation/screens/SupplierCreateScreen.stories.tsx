import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { SupplierCreateScreen } from './SupplierCreateScreen';
import type { SupplierForm } from '../../domain';

const defaultValues: SupplierForm = { name: '', address: '', mapsLink: '' };

const CreateStory = () => {
  const form = useForm<SupplierForm>({ defaultValues });
  return (
    <SupplierCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof SupplierCreateScreen> = {
  title: 'Screens/Suppliers/SupplierCreateScreen',
  component: SupplierCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SupplierCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
