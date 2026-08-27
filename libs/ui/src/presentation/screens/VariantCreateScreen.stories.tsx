import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantCreateScreen } from './VariantCreateScreen';
import type { VariantForm } from '../../domain';
import { mockProduct, mockMaterials } from '../../../.storybook/mocks/mockData';

const defaultValues: VariantForm = {
  name: '',
  price: 0,
  description: '',
  recipe: '',
  materials: [],
  productId: mockProduct.id,
  values: [],
  pricingTiers: [],
};

const meta: Meta<typeof VariantCreateScreen> = {
  title: 'Screens/Variants/VariantCreateScreen',
  component: VariantCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof VariantCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues,
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
    product: mockProduct,
    materialList: {
      currentPage: 1,
      itemPerPage: 10,
      onPageChange: fn(),
      onRetryButtonPress: fn(),
      onSearchValueChange: fn(),
      searchValue: '',
      totalItem: mockMaterials.length,
      variant: { type: 'loaded', items: mockMaterials },
    },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
    variant: { type: 'loading' },
    product: null,
    materialList: {
      ...Default.args.materialList,
      totalItem: 0,
      variant: { type: 'loading' },
    },
  },
};
