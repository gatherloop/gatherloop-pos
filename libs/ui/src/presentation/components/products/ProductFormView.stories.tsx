import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ProductFormView } from './ProductFormView';
import type { ProductForm } from '../../../domain';
import { mockVariants } from '../../../../.storybook/mocks/mockData';

const defaultCategoryOptions = [
  { label: 'Electronics', value: 1 },
  { label: 'Clothing', value: 2 },
  { label: 'Food & Beverages', value: 3 },
];

const defaultValues: ProductForm = {
  name: '',
  description: '',
  categoryId: 1,
  imageUrl: '',
  options: [],
  saleType: 'purchase',
};

const LoadedStory = () => {
  const form = useForm<ProductForm>({ defaultValues });
  return (
    <ProductFormView
      variant={{ type: 'loaded' }}
      form={form}
      variants={[]}
      onSubmit={fn()}
      categorySelectOptions={defaultCategoryOptions}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
      onVariantCreatePress={fn()}
      onVariantEditMenuPress={fn()}
      onVariantDeleteMenuPress={fn()}
      onVariantPress={fn()}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<ProductForm>({
    defaultValues: {
      name: 'iPhone 14',
      description: 'Latest Apple iPhone',
      categoryId: 1,
      imageUrl: 'https://placehold.jp/120x120.png',
      saleType: 'purchase',
      options: [
        {
          name: 'Color',
          values: [{ name: 'Blue' }, { name: 'Black' }],
        },
      ],
    },
  });
  return (
    <ProductFormView
      variant={{ type: 'loaded' }}
      form={form}
      variants={mockVariants}
      onSubmit={fn()}
      categorySelectOptions={defaultCategoryOptions}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
      onVariantCreatePress={fn()}
      onVariantEditMenuPress={fn()}
      onVariantDeleteMenuPress={fn()}
      onVariantPress={fn()}
    />
  );
};

const SubmitDisabledStory = () => {
  const form = useForm<ProductForm>({ defaultValues });
  return (
    <ProductFormView
      variant={{ type: 'loaded' }}
      form={form}
      variants={[]}
      onSubmit={fn()}
      categorySelectOptions={defaultCategoryOptions}
      isSubmitDisabled={true}
      onRetryButtonPress={fn()}
    />
  );
};

const meta: Meta<typeof ProductFormView> = {
  title: 'Features/Products/ProductFormView',
  component: ProductFormView,
};

export default meta;
type Story = StoryObj<typeof ProductFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

const LoadingStory = () => {
  const form = useForm<ProductForm>({ defaultValues });
  return (
    <ProductFormView
      variant={{ type: 'loading' }}
      form={form}
      variants={[]}
      onSubmit={fn()}
      categorySelectOptions={defaultCategoryOptions}
      isSubmitDisabled={true}
      onRetryButtonPress={fn()}
    />
  );
};

const ErrorStory = () => {
  const form = useForm<ProductForm>({ defaultValues });
  return (
    <ProductFormView
      variant={{ type: 'error' }}
      form={form}
      variants={[]}
      onSubmit={fn()}
      categorySelectOptions={defaultCategoryOptions}
      isSubmitDisabled={true}
      onRetryButtonPress={fn()}
    />
  );
};

export const Loading: Story = {
  render: () => <LoadingStory />,
};

export const Error: Story = {
  render: () => <ErrorStory />,
};

export const SubmitDisabled: Story = {
  render: () => <SubmitDisabledStory />,
};
