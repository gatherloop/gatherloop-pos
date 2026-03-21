import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { YStack, Text } from 'tamagui';
import { VariantFormView } from './VariantFormView';
import type { VariantForm } from '../../../domain';
import { mockProduct, mockMaterial } from '../../../../.storybook/mocks/mockData';

const defaultValues: VariantForm = {
  name: '',
  price: 0,
  description: '',
  materials: [],
  productId: 1,
  values: [],
};

const LoadedStory = () => {
  const form = useForm<VariantForm>({ defaultValues });
  return (
    <VariantFormView
      variant={{ type: 'loaded' }}
      onRetryButtonPress={fn()}
      form={form}
      onSubmit={fn()}
      product={mockProduct}
      isMaterialSheetOpen={false}
      onMaterialSheetOpenChange={fn()}
      onRemoveMaterial={fn()}
      isSubmitDisabled={false}
      MaterialList={() => (
        <YStack>
          <Text color="$color">+ Add Material</Text>
        </YStack>
      )}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<VariantForm>({
    defaultValues: {
      name: 'iPhone 14 - Blue 128GB',
      price: 15000000,
      description: 'Blue 128GB variant',
      materials: [{ materialId: 1, amount: 2, material: mockMaterial }],
      productId: 1,
      values: [{ optionValueId: 1 }],
    },
  });
  return (
    <VariantFormView
      variant={{ type: 'loaded' }}
      onRetryButtonPress={fn()}
      form={form}
      onSubmit={fn()}
      product={mockProduct}
      isMaterialSheetOpen={false}
      onMaterialSheetOpenChange={fn()}
      onRemoveMaterial={fn()}
      isSubmitDisabled={false}
      MaterialList={() => (
        <YStack>
          <Text color="$color">+ Add Material</Text>
        </YStack>
      )}
    />
  );
};

const meta: Meta<typeof VariantFormView> = {
  title: 'Features/Variants/VariantFormView',
  component: VariantFormView,
};

export default meta;
type Story = StoryObj<typeof VariantFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const Loading: Story = {
  render: () => {
    const form = useForm<VariantForm>({ defaultValues });
    return (
      <VariantFormView
        variant={{ type: 'loading' }}
        onRetryButtonPress={fn()}
        form={form}
        onSubmit={fn()}
        product={null}
        isMaterialSheetOpen={false}
        onMaterialSheetOpenChange={fn()}
        onRemoveMaterial={fn()}
        isSubmitDisabled={true}
        MaterialList={() => null}
      />
    );
  },
};

export const Error: Story = {
  render: () => {
    const form = useForm<VariantForm>({ defaultValues });
    return (
      <VariantFormView
        variant={{ type: 'error' }}
        onRetryButtonPress={fn()}
        form={form}
        onSubmit={fn()}
        product={null}
        isMaterialSheetOpen={false}
        onMaterialSheetOpenChange={fn()}
        onRemoveMaterial={fn()}
        isSubmitDisabled={true}
        MaterialList={() => null}
      />
    );
  },
};
