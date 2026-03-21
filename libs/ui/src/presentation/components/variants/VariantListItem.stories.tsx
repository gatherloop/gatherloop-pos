import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantListItem } from './VariantListItem';
import { mockOptionValues } from '../../../../.storybook/mocks/mockData';

const meta: Meta<typeof VariantListItem> = {
  title: 'Features/Variants/VariantListItem',
  component: VariantListItem,
  args: {
    price: 35000,
    productName: 'Iced Coffee Latte',
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
    price: 55000,
    productName: 'Arabica Single Origin',
    optionValues: [
      { id: 1, name: 'Hot' },
      { id: 2, name: 'Large' },
    ],
  },
};
