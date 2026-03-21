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
};

const LoadedStory = () => {
  const form = useForm<MaterialForm>({ defaultValues });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<MaterialForm>({
    defaultValues: {
      name: 'Coffee Bean',
      price: 80000,
      unit: 'kg',
      description: 'Premium Arabica coffee beans',
    },
  });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
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

const SubmitDisabledStory = () => {
  const form = useForm<MaterialForm>({ defaultValues });
  return (
    <MaterialFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
    />
  );
};

export const SubmitDisabled: Story = {
  render: () => <SubmitDisabledStory />,
};
