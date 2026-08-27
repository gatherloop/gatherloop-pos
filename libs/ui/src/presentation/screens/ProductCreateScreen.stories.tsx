import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductCreateScreen } from './ProductCreateScreen';
import type { ProductForm } from '../../domain';
import { mockCategories, mockVariants } from '../../../.storybook/mocks/mockData';

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

const categorySelectOptions = mockCategories.map((c) => ({ label: c.name, value: c.id }));

const meta: Meta<typeof ProductCreateScreen> = {
  title: 'Screens/Products/ProductCreateScreen',
  component: ProductCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProductCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues,
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    variant: { type: 'loaded' },
    categorySelectOptions,
    variants: mockVariants,
    onLogoutPress: fn(),
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
    variant: { type: 'loading' },
    categorySelectOptions: [],
    variants: [],
  },
};
