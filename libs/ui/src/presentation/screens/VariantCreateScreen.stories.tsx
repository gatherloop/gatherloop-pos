import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { VariantCreateScreen } from './VariantCreateScreen';
import type { VariantForm } from '../../domain';
import { mockProduct, mockMaterials } from '../../../.storybook/mocks/mockData';

const defaultValues: VariantForm = {
  name: '',
  price: 0,
  description: '',
  materials: [],
  productId: mockProduct.id,
  values: [],
};

const CreateStory = () => {
  const form = useForm<VariantForm>({ defaultValues });
  const rentalsFieldArray = useFieldArray({
    control: form.control,
    name: 'materials',
    keyName: 'key',
  });
  return (
    <VariantCreateScreen
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
  const form = useForm<VariantForm>({ defaultValues });
  return (
    <VariantCreateScreen
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

const meta: Meta<typeof VariantCreateScreen> = {
  title: 'Screens/Variants/VariantCreateScreen',
  component: VariantCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof VariantCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
