import React from 'react';
import { render, screen } from '@testing-library/react';
import { TransactionList } from './TransactionList';
import { Transaction } from '../../../domain';

const baseProps = {
  searchValue: '',
  onSearchValueChange: jest.fn(),
  paymentStatus: 'all' as const,
  onPaymentStatusChange: jest.fn(),
  currentPage: 1,
  onPageChange: jest.fn(),
  totalItem: 0,
  itemPerPage: 10,
  onRetryButtonPress: jest.fn(),
  onEditMenuPress: jest.fn(),
  onDeleteMenuPress: jest.fn(),
  onPayMenuPress: jest.fn(),
  onUnpayMenuPress: jest.fn(),
  onPrintInvoiceMenuPress: jest.fn(),
  onPrintOrderSlipMenuPress: jest.fn(),
  onItemPress: jest.fn(),
  wallets: [],
  walletId: null,
  onWalletIdChange: jest.fn(),
};

const mockTransaction: Transaction = {
  id: 1,
  createdAt: '2024-01-01T10:00:00Z',
  name: 'John Doe',
  orderNumber: 1,
  total: 50000,
  totalIncome: 45000,
  transactionItems: [],
  transactionCoupons: [],
  wallet: null,
  paidAt: null,
  paidAmount: 0,
};

describe('TransactionList', () => {
  it('should render loading view when variant is loading', () => {
    render(<TransactionList {...baseProps} transactions={[]} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Transactions...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<TransactionList {...baseProps} transactions={[]} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Transactions')).toBeTruthy();
  });

  it('should render empty view when variant is loaded with no transactions', () => {
    render(<TransactionList {...baseProps} transactions={[]} variant={{ type: 'loaded' }} />);
    expect(screen.getByText('Oops, Transaction is Empty')).toBeTruthy();
  });

  it('should render transaction items when variant is loaded with transactions', () => {
    const transactions = [
      mockTransaction,
      { ...mockTransaction, id: 2, name: 'Jane Smith' },
    ];
    render(
      <TransactionList {...baseProps} transactions={transactions} variant={{ type: 'loaded' }} />
    );
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jane Smith')).toBeTruthy();
  });
});
