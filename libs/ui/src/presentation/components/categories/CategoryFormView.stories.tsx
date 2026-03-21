import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CategoryFormView } from './CategoryFormView';
import type { CategoryForm } from '../../../domain';

const LoadedStory = () => {
  const form = useForm<CategoryForm>({ defaultValues: { name: '' } });
  return (
    <CategoryFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<CategoryForm>({
    defaultValues: { name: 'Electronics' },
  });
  return (
    <CategoryFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const meta: Meta<typeof CategoryFormView> = {
  title: 'Features/Categories/CategoryFormView',
  component: CategoryFormView,
};

export default meta;
type Story = StoryObj<typeof CategoryFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const Loading: Story = {
  render: () => {
    const form = useForm<CategoryForm>({ defaultValues: { name: '' } });
    return (
      <CategoryFormView
        variant={{ type: 'loading' }}
        form={form}
        onSubmit={fn()}
        isSubmitDisabled={true}
      />
    );
  },
};

export const Error: Story = {
  render: () => {
    const form = useForm<CategoryForm>({ defaultValues: { name: '' } });
    return (
      <CategoryFormView
        variant={{ type: 'error', onRetryButtonPress: fn() }}
        form={form}
        onSubmit={fn()}
        isSubmitDisabled={true}
      />
    );
  },
};

export const SubmitDisabled: Story = {
  render: () => {
    const form = useForm<CategoryForm>({ defaultValues: { name: '' } });
    return (
      <CategoryFormView
        variant={{ type: 'loaded' }}
        form={form}
        onSubmit={fn()}
        isSubmitDisabled={true}
      />
    );
  },
};
