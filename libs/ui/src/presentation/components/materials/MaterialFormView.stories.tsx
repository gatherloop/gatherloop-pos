import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { MaterialFormView } from './MaterialFormView';
import type { MaterialForm } from '../../../domain';

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

const LoadedStory = () => {
  const form = useForm<MaterialForm>({ defaultValues });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      suppliers={[]}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<MaterialForm>({
    defaultValues: {
      ...defaultValues,
      name: 'Coffee Bean',
      price: 80000,
      unit: 'kg',
      description: 'Premium Arabica coffee beans',
      purchaseUnit: 'Kg',
      purchaseUnitSize: 1000,
      minimumStock: 5,
      normalStock: 10,
    },
  });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      suppliers={[]}
    />
  );
};

const ExcludedFromStockCheckStory = () => {
  const form = useForm<MaterialForm>({
    defaultValues: {
      ...defaultValues,
      name: 'Cleaning Cloth',
      price: 5000,
      unit: 'pcs',
      isStockCheckRequired: false,
    },
  });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      suppliers={[]}
    />
  );
};

const meta: Meta<typeof MaterialFormView> = {
  title: 'Features/Materials/MaterialFormView',
  component: MaterialFormView,
};

export default meta;
type Story = StoryObj<typeof MaterialFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const ExcludedFromStockCheck: Story = {
  render: () => <ExcludedFromStockCheckStory />,
};

const SubmitDisabledStory = () => {
  const form = useForm<MaterialForm>({ defaultValues });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
      suppliers={[]}
    />
  );
};

export const SubmitDisabled: Story = {
  render: () => <SubmitDisabledStory />,
};
