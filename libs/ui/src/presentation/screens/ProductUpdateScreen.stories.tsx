import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ProductUpdateScreen } from './ProductUpdateScreen';
import type { ProductForm } from '../../domain';
import { mockCategories, mockVariants } from '../../../.storybook/mocks/mockData';

const categorySelectOptions = mockCategories.map((c) => ({ label: c.name, value: c.id }));

const UpdateStory = () => {
  const form = useForm<ProductForm>({
    defaultValues: {
      name: 'Iced Coffee Latte',
      description: 'Refreshing iced coffee with fresh milk',
      categoryId: 1,
      imageUrl: 'https://placehold.jp/120x120.png',
      options: [{ name: 'Temperature', values: [{ name: 'Iced' }, { name: 'Hot' }] }],
      saleType: 'purchase',
    },
  });
  return (
    <ProductUpdateScreen
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
  const form = useForm<ProductForm>({
    defaultValues: { name: '', description: '', categoryId: 1, imageUrl: '', options: [], saleType: 'purchase' },
  });
  return (
    <ProductUpdateScreen
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

const meta: Meta<typeof ProductUpdateScreen> = {
  title: 'Screens/Products/ProductUpdateScreen',
  component: ProductUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProductUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
