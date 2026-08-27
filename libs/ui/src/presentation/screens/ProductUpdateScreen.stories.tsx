import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductUpdateScreen } from './ProductUpdateScreen';
import type { ProductForm } from '../../domain';
import { mockCategories, mockVariants } from '../../../.storybook/mocks/mockData';

const defaultValues: ProductForm = {
  name: 'Iced Coffee Latte',
  description: 'Refreshing iced coffee with fresh milk',
  recipe:
    '1. Pull a double shot of espresso.\n2. Fill glass with ice.\n3. Pour espresso over ice.\n4. Top with fresh milk, stir gently.',
  categoryId: 1,
  imageUrl: 'https://placehold.jp/120x120.png',
  options: [{ name: 'Temperature', values: [{ name: 'Iced' }, { name: 'Hot' }] }],
  saleType: 'purchase',
  status: 'published',
};

const loadingValues: ProductForm = {
  name: '',
  description: '',
  recipe: '',
  categoryId: 1,
  imageUrl: '',
  options: [],
  saleType: 'purchase',
  status: 'published',
};

const categorySelectOptions = mockCategories.map((c) => ({ label: c.name, value: c.id }));

const variantDeleteAlert = {
  isOpen: false,
  onCancel: fn(),
  onConfirm: fn(),
  isButtonDisabled: false,
};

const meta: Meta<typeof ProductUpdateScreen> = {
  title: 'Screens/Products/ProductUpdateScreen',
  component: ProductUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProductUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues,
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    variant: { type: 'loaded' },
    categorySelectOptions,
    variants: mockVariants,
    onVariantDeleteMenuPress: fn(),
    onVariantEditMenuPress: fn(),
    onVariantPress: fn(),
    onVariantCreatePress: fn(),
    variantDeleteAlert,
    onLogoutPress: fn(),
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    defaultValues: loadingValues,
    isSubmitDisabled: true,
    variant: { type: 'loading' },
    categorySelectOptions: [],
    variants: [],
  },
};
