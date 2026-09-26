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
    enabledMethods: ['qris'],
    method: 'qris',
    onMethodChange: () => {
      // Storybook action stand-in
    },
    diningOption: 'dine_in',
    onDiningOptionChange: () => {
      // Storybook action stand-in
    },
    cashierLocation: 'Lantai 1',
    verificationPhoto: null,
    onCapturePhoto: () => {
      // Storybook action stand-in
    },
    onRetakePhoto: () => {
      // Storybook action stand-in
    },
    isSubmitting: false,
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
    enabledMethods: ['qris', 'cash'],
    method: 'qris',
  },
};

export const CashPaymentEnabledCash: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    enabledMethods: ['qris', 'cash'],
    method: 'cash',
  },
};

export const CodPaymentEnabled: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    enabledMethods: ['qris', 'cod'],
    method: 'qris',
  },
};

export const CodSelectedAwaitingPhoto: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    enabledMethods: ['qris', 'cod'],
    method: 'cod',
  },
};

export const CodSelectedWithPhoto: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    enabledMethods: ['qris', 'cod'],
    method: 'cod',
    verificationPhoto:
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  },
};

export const TakeawaySelected: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    diningOption: 'takeaway',
  },
};

export const Submitting: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7890',
    isSubmitting: true,
  },
};

export const WhatsappNotRegistered: Story = {
  args: {
    name: 'Budi',
    whatsappNumber: '0812 3456 7809',
    whatsappNumberErrorMessage:
      'Nomor WhatsApp tidak terdaftar di WhatsApp. Mohon periksa kembali.',
  },
};
