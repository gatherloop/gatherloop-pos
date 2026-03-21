import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { SupplierFormView } from './SupplierFormView';
import type { SupplierForm } from '../../../domain';

const defaultValues: SupplierForm = {
  name: '',
  phone: '',
  address: '',
  mapsLink: '',
};

const LoadedStory = () => {
  const form = useForm<SupplierForm>({ defaultValues });
  return (
    <SupplierFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<SupplierForm>({
    defaultValues: {
      name: 'PT. Supplier Utama',
      phone: '+6281234567890',
      address: 'Jl. Raya No. 1, Jakarta Selatan',
      mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
    },
  });
  return (
    <SupplierFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const meta: Meta<typeof SupplierFormView> = {
  title: 'Features/Suppliers/SupplierFormView',
  component: SupplierFormView,
};

export default meta;
type Story = StoryObj<typeof SupplierFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const SubmitDisabled: Story = {
  render: () => {
    const form = useForm<SupplierForm>({ defaultValues });
    return (
      <SupplierFormView
        form={form}
        onSubmit={fn()}
        isSubmitDisabled={true}
      />
    );
  },
};
