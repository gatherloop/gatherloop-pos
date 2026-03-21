import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { MaterialUpdateScreen } from './MaterialUpdateScreen';
import type { MaterialForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<MaterialForm>({
    defaultValues: { name: 'Steel', price: 50000, unit: 'kg', description: 'High quality steel' },
  });
  return (
    <MaterialUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof MaterialUpdateScreen> = {
  title: 'Screens/Materials/MaterialUpdateScreen',
  component: MaterialUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MaterialUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
