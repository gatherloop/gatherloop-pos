import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import {
  ProductFormView,
  productCreateFormResolver,
} from './ProductFormView';
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

const meta: Meta<typeof ProductFormView> = {
  title: 'Features/Products/ProductFormView',
  component: ProductFormView,
};

export default meta;
type Story = StoryObj<typeof ProductFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues,
    resolver: productCreateFormResolver,
    variants: [],
    onSubmit: fn(),
    categorySelectOptions: defaultCategoryOptions,
    isSubmitDisabled: false,
    isSubmitting: false,
    onVariantCreatePress: fn(),
    onVariantEditMenuPress: fn(),
    onVariantDeleteMenuPress: fn(),
    onVariantPress: fn(),
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
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
    variants: mockVariants,
  },
};

export const LongRecipe: Story = {
  args: {
    ...Loaded.args,
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
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};

export const SubmitDisabled: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
  },
};
