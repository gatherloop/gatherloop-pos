import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CategoryUpdateScreen } from './CategoryUpdateScreen';
import type { CategoryForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<CategoryForm>({ defaultValues: { name: 'Beverages' } });
  return (
    <CategoryUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<CategoryForm>({ defaultValues: { name: '' } });
  return (
    <CategoryUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof CategoryUpdateScreen> = {
  title: 'Screens/Categories/CategoryUpdateScreen',
  component: CategoryUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CategoryUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
