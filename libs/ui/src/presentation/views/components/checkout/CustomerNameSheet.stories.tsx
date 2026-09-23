import type { Meta, StoryObj } from '@storybook/react';
import { CustomerNameSheet } from './CustomerNameSheet';

const meta: Meta<typeof CustomerNameSheet> = {
  title: 'Components/Checkout/CustomerNameSheet',
  component: CustomerNameSheet,
  args: {
    isOpen: true,
    name: '',
    errorMessage: null,
    onNameChange: () => {
      // Storybook action stand-in
    },
    onSubmitPress: () => {
      // Storybook action stand-in
    },
    onCancelPress: () => {
      // Storybook action stand-in
    },
    isCashPaymentEnabled: false,
    method: 'qris',
    onMethodChange: () => {
      // Storybook action stand-in
    },
    cashierLocation: 'Lantai 1',
  },
};

export default meta;
type Story = StoryObj<typeof CustomerNameSheet>;

export const Empty: Story = {};

export const Prefilled: Story = {
  args: { name: 'Budi' },
};

export const WithError: Story = {
  args: { name: '   ', errorMessage: 'Nama tidak boleh kosong' },
};

export const Closed: Story = {
  args: { isOpen: false },
};

export const CashPaymentEnabledQris: Story = {
  args: { name: 'Budi', isCashPaymentEnabled: true, method: 'qris' },
};

export const CashPaymentEnabledCash: Story = {
  args: { name: 'Budi', isCashPaymentEnabled: true, method: 'cash' },
};
