import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ProductCreateScreen } from './ProductCreateScreen';
import type { ProductForm } from '../../domain';
import { mockCategories, mockVariants } from '../../../.storybook/mocks/mockData';

const defaultValues: ProductForm = {
  name: '',
  description: '',
  categoryId: 1,
  imageUrl: '',
  options: [],
  saleType: 'purchase',
};

const categorySelectOptions = mockCategories.map((c) => ({ label: c.name, value: c.id }));

const CreateStory = () => {
  const form = useForm<ProductForm>({ defaultValues });
  return (
    <ProductCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
      variant={{ type: 'loaded' }}
      categorySelectOptions={categorySelectOptions}
      variants={mockVariants}
      onLogoutPress={fn()}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<ProductForm>({ defaultValues });
  return (
    <ProductCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onRetryButtonPress={fn()}
      variant={{ type: 'loading' }}
      categorySelectOptions={[]}
      variants={[]}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof ProductCreateScreen> = {
  title: 'Screens/Products/ProductCreateScreen',
  component: ProductCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProductCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
