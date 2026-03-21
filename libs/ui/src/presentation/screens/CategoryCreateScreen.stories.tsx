import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CategoryCreateScreen } from './CategoryCreateScreen';
import type { CategoryForm } from '../../domain';

const CreateStory = () => {
  const form = useForm<CategoryForm>({ defaultValues: { name: '' } });
  return (
    <CategoryCreateScreen
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
    <CategoryCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof CategoryCreateScreen> = {
  title: 'Screens/Categories/CategoryCreateScreen',
  component: CategoryCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CategoryCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
