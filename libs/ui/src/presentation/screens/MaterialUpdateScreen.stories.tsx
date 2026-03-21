import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { MaterialUpdateScreen } from './MaterialUpdateScreen';
import type { MaterialForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<MaterialForm>({
    defaultValues: { name: 'Coffee Bean', price: 80000, unit: 'kg', description: 'Premium Arabica coffee beans' },
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
