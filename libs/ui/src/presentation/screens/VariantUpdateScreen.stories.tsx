import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { VariantUpdateScreen } from './VariantUpdateScreen';
import type { VariantForm } from '../../domain';
import { mockProduct, mockMaterials, mockVariant } from '../../../.storybook/mocks/mockData';

const UpdateStory = () => {
  const form = useForm<VariantForm>({
    defaultValues: {
      name: mockVariant.name,
      price: mockVariant.price,
      description: mockVariant.description,
      materials: [],
      productId: mockProduct.id,
      values: [],
    },
  });
  return (
    <VariantUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      isMaterialSheetOpen={false}
      onMaterialSheetOpenChange={fn()}
      onAddMaterial={fn()}
      onRemoveMaterial={fn()}
      variant={{ type: 'loaded' }}
      product={mockProduct}
      materialList={{
        currentPage: 1,
        itemPerPage: 10,
        onPageChange: fn(),
        onRetryButtonPress: fn(),
        onSearchValueChange: fn(),
        searchValue: '',
        totalItem: mockMaterials.length,
        variant: { type: 'loaded', items: mockMaterials },
      }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<VariantForm>({
    defaultValues: { name: '', price: 0, materials: [], productId: 1, values: [] },
  });
  return (
    <VariantUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      isMaterialSheetOpen={false}
      onMaterialSheetOpenChange={fn()}
      onAddMaterial={fn()}
      onRemoveMaterial={fn()}
      variant={{ type: 'loading' }}
      product={null}
      materialList={{
        currentPage: 1,
        itemPerPage: 10,
        onPageChange: fn(),
        onRetryButtonPress: fn(),
        onSearchValueChange: fn(),
        searchValue: '',
        totalItem: 0,
        variant: { type: 'loading' },
      }}
    />
  );
};

const meta: Meta<typeof VariantUpdateScreen> = {
  title: 'Screens/Variants/VariantUpdateScreen',
  component: VariantUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof VariantUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
