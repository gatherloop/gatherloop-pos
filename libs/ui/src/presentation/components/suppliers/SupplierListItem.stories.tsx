import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierListItem } from './SupplierListItem';

const meta: Meta<typeof SupplierListItem> = {
  title: 'Features/Suppliers/SupplierListItem',
  component: SupplierListItem,
  args: {
    name: 'PT. Kopi Nusantara',
    phone: '+6281234567890',
    address: 'Jl. Raya No. 1, Jakarta Selatan',
    mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
    onOpenMapMenuPress: fn(),
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SupplierListItem>;

export const Default: Story = {};

export const WithoutPhone: Story = {
  args: {
    phone: undefined,
  },
};

export const WithoutMenus: Story = {
  args: {
    onOpenMapMenuPress: undefined,
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};

export const LongAddress: Story = {
  args: {
    address: 'Jl. Industri Raya No. 5, Kelurahan Cengkareng Barat, Kecamatan Cengkareng, Jakarta Barat 11730',
  },
};
