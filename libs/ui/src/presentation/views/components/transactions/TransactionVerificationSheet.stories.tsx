import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionVerificationSheet } from './TransactionVerificationSheet';
import { Transaction } from '../../../../domain';

const mockVariant = {
  id: 1,
  name: 'Variant 1',
  price: 45000,
  materials: [],
  product: {
    id: 1,
    name: 'Kopi Susu',
    category: {
      id: 1,
      name: 'Coffee',
      station: 'BAR' as const,
      createdAt: '2024-01-20T10:00:00.000Z',
    },
    imageUrl: '',
    saleType: 'purchase' as const,
    status: 'published' as const,
    options: [],
    createdAt: '2024-01-20T10:00:00.000Z',
    isAvailable: true,
    availabilityTracking: 'none' as const,
    isSellable: true,
  },
  createdAt: '2024-01-20T10:00:00.000Z',
  values: [],
  pricingTiers: [],
  isAvailable: true,
  isSellable: true,
};

const mockTransaction: Transaction = {
  id: 12,
  createdAt: '2024-01-20T10:00:00.000Z',
  name: 'Budi',
  source: 'order',
  diningOption: 'dine_in',
  paymentMethod: 'cod',
  paymentVerificationStatus: 'awaiting',
  table: { id: 1, label: 'A1', floorNumber: 1 },
  pagerNumber: 0,
  transactionNumber: 12,
  total: 45000,
  totalIncome: 45000,
  transactionItems: [
    {
      id: 1,
      variant: mockVariant,
      amount: 1,
      price: 45000,
      discountAmount: 0,
      subtotal: 45000,
      note: '',
      productName: 'Kopi Susu',
      values: [],
    },
  ],
  transactionCoupons: [],
  wallet: null,
  paidAt: null,
  paidAmount: 0,
  completedAt: null,
};

const meta: Meta<typeof TransactionVerificationSheet> = {
  title: 'Components/Transactions/TransactionVerificationSheet',
  component: TransactionVerificationSheet,
  args: {
    isOpen: true,
    variant: 'shown',
    transaction: mockTransaction,
    photo: 'data:image/jpeg;base64,mock-cod-verification-photo',
    capturedAt: '2024-01-20T10:00:00.000Z',
    errorMessage: null,
    onClose: fn(),
    onApprovePress: fn(),
    onRejectPress: fn(),
    onRejectCancel: fn(),
    onRejectConfirm: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionVerificationSheet>;

export const Loading: Story = {
  args: {
    variant: 'loading',
    transaction: null,
    photo: null,
    capturedAt: null,
  },
};

export const Shown: Story = {};

export const Approving: Story = {
  args: {
    variant: 'approving',
  },
};

export const ConfirmingReject: Story = {
  args: {
    variant: 'confirmingReject',
  },
};

export const Rejecting: Story = {
  args: {
    variant: 'rejecting',
  },
};

export const Gone: Story = {
  args: {
    variant: 'gone',
    photo: null,
    capturedAt: null,
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    photo: null,
    capturedAt: null,
    errorMessage: 'Failed to load the verification photo',
  },
};
