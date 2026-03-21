import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { MaterialCreateScreen } from './MaterialCreateScreen';
import type { MaterialForm } from '../../domain';

const defaultValues: MaterialForm = { name: '', price: 0, unit: '' };

const CreateStory = () => {
  const form = useForm<MaterialForm>({ defaultValues });
  return (
    <MaterialCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<MaterialForm>({
    defaultValues: { name: 'Steel', price: 50000, unit: 'kg', description: 'High quality steel' },
  });
  return (
    <MaterialCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof MaterialCreateScreen> = {
  title: 'Screens/Materials/MaterialCreateScreen',
  component: MaterialCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MaterialCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Populated: Story = { render: () => <PopulatedStory /> };
