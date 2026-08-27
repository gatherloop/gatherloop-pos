import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantUpdateScreen } from './VariantUpdateScreen';
import type { VariantForm } from '../../domain';
import {
  mockProduct,
  mockMaterials,
  mockVariant,
} from '../../../.storybook/mocks/mockData';

const defaultValues: VariantForm = {
  name: mockVariant.name,
  price: mockVariant.price,
  description: mockVariant.description,
  recipe: mockVariant.recipe,
  materials: mockVariant.materials,
  productId: mockProduct.id,
  values: mockVariant.values.map((value) => ({
    id: value.id,
    optionValueId: value.optionValueId,
  })),
  pricingTiers: mockVariant.pricingTiers,
};

const meta: Meta<typeof VariantUpdateScreen> = {
  title: 'Screens/Variants/VariantUpdateScreen',
  component: VariantUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof VariantUpdateScreen>;

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
    defaultValues: {
      name: '',
      price: 0,
      description: '',
      recipe: '',
      materials: [],
      productId: 1,
      values: [],
      pricingTiers: [],
    },
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
