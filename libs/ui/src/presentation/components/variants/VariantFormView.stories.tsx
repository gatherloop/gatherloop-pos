import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { YStack, Text } from 'tamagui';
import { VariantFormView } from './VariantFormView';
import type { VariantForm } from '../../../domain';
import { mockProduct, mockMaterial } from '../../../../.storybook/mocks/mockData';

const defaultValues: VariantForm = {
  name: '',
  price: 0,
  description: '',
  recipe: '',
  materials: [],
  productId: 1,
  values: [],
  pricingTiers: [],
};

const meta: Meta<typeof VariantFormView> = {
  title: 'Features/Variants/VariantFormView',
  component: VariantFormView,
};

export default meta;
type Story = StoryObj<typeof VariantFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues,
    onSubmit: fn(),
    product: mockProduct,
    isSubmitDisabled: false,
    isSubmitting: false,
    MaterialList: () => (
      <YStack>
        <Text color="$color">+ Add Material</Text>
      </YStack>
    ),
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      name: 'Iced Coffee Latte - Iced Regular',
      price: 35000,
      description: 'Iced version, regular size',
      recipe:
        '- Use regular ice, not crushed.\n- Standard 250ml cup.\n- No extra syrup unless requested.',
      materials: [{ materialId: 1, amount: 0.015, material: mockMaterial }],
      productId: 1,
      values: [{ optionValueId: 1 }],
      pricingTiers: [],
    },
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    product: null,
    isSubmitDisabled: true,
    MaterialList: () => null,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    product: null,
    isSubmitDisabled: true,
    MaterialList: () => null,
  },
};
