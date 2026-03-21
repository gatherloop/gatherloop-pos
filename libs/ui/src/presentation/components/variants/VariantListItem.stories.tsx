import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantListItem } from './VariantListItem';
import { mockOptionValues } from '../../../../.storybook/mocks/mockData';

const meta: Meta<typeof VariantListItem> = {
  title: 'Features/Variants/VariantListItem',
  component: VariantListItem,
  args: {
    price: 15000000,
    productName: 'iPhone 14',
    productImageUrl: 'https://placehold.jp/120x120.png',
    optionValues: mockOptionValues,
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof VariantListItem>;

export const Default: Story = {};

export const NoOptions: Story = {
  args: {
    optionValues: [],
  },
};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};

export const HighPrice: Story = {
  args: {
    price: 75000000,
    productName: 'MacBook Pro 16"',
    optionValues: [
      { id: 1, name: 'Space Gray' },
      { id: 2, name: '32GB RAM' },
    ],
  },
};
