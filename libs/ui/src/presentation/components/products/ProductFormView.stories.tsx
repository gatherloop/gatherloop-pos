import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ProductFormView } from './ProductFormView';
import type { ProductForm } from '../../../domain';
import { mockVariants } from '../../../../.storybook/mocks/mockData';

const defaultCategoryOptions = [
  { label: 'Beverages', value: 1 },
  { label: 'Snacks', value: 2 },
  { label: 'Merchandise', value: 3 },
];

const defaultValues: ProductForm = {
  name: '',
  description: '',
  recipe: '',
  categoryId: 1,
  imageUrl: '',
  options: [],
  saleType: 'purchase',
  status: 'published',
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
      name: 'Iced Coffee Latte',
      description: 'Refreshing iced coffee with fresh milk',
      recipe:
        '1. Pull a double shot of espresso.\n2. Fill glass with ice.\n3. Pour espresso over ice.\n4. Top with fresh milk, stir gently.',
      categoryId: 1,
      imageUrl: 'https://placehold.jp/120x120.png',
      saleType: 'purchase',
      status: 'published',
      options: [
        {
          name: 'Temperature',
          values: [{ name: 'Iced' }, { name: 'Hot' }],
        },
        {
          name: 'Size',
          values: [{ name: 'Regular' }, { name: 'Large' }],
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

const LongRecipeStory = () => {
  const form = useForm<ProductForm>({
    defaultValues: {
      name: 'Signature Cold Brew',
      description: 'Smooth 18-hour steeped cold brew',
      recipe: [
        '## Preparation',
        '',
        '1. Coarse-grind 100g of house blend beans.',
        '2. Steep in 1L filtered water at room temperature for 18 hours.',
        '3. Strain through a paper filter, twice.',
        '4. Store concentrate refrigerated, use within 5 days.',
        '',
        '## Service',
        '',
        '- Pour 120ml concentrate over ice.',
        '- Top with 90ml filtered water.',
        '- **Never** dilute with milk unless the guest asks.',
      ].join('\n'),
      categoryId: 1,
      imageUrl: 'https://placehold.jp/120x120.png',
      saleType: 'purchase',
      status: 'published',
      options: [],
    },
  });
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

export const LongRecipe: Story = {
  render: () => <LongRecipeStory />,
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
