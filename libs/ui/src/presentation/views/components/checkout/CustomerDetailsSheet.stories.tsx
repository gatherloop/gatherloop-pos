import type { Meta, StoryObj } from '@storybook/react';
import { CustomerDetailsSheet } from './CustomerDetailsSheet';

const meta: Meta<typeof CustomerDetailsSheet> = {
  title: 'Components/Checkout/CustomerDetailsSheet',
  component: CustomerDetailsSheet,
  args: {
    isOpen: true,
    name: '',
    nameErrorMessage: null,
    onNameChange: () => {
      // Storybook action stand-in
    },
    whatsappNumber: '',
    whatsappNumberErrorMessage: null,
    onWhatsappNumberChange: () => {
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
    diningOption: 'dine_in',
    onDiningOptionChange: () => {
      // Storybook action stand-in
    },
    cashierLocation: 'Lantai 1',
  },
};

export default meta;
type Story = StoryObj<typeof CustomerDetailsSheet>;

export const Empty: Story = {};

export const Prefilled: Story = {
  args: { name: 'Budi', whatsappNumber: '0812 3456 7890' },
};

export const NameError: Story = {
  args: { name: '   ', nameErrorMessage: 'Nama tidak boleh kosong' },
};

export const WhatsappNumberError: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '12345',
    whatsappNumberErrorMessage: 'Nomor WhatsApp tidak valid',
  },
};

export const Closed: Story = {
  args: { isOpen: false },
};

export const CashPaymentEnabledQris: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    isCashPaymentEnabled: true,
    method: 'qris',
  },
};

export const CashPaymentEnabledCash: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    isCashPaymentEnabled: true,
    method: 'cash',
  },
};

export const TakeawaySelected: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    diningOption: 'takeaway',
  },
};
