import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletList } from './WalletList';
import { Wallet } from '../../../domain';

const baseProps = {
  onRetryButtonPress: jest.fn(),
  onEditMenuPress: jest.fn(),
  onTransferMenuPress: jest.fn(),
  onItemPress: jest.fn(),
};

const mockWallet: Wallet = {
  id: 1,
  name: 'Cash',
  balance: 500000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-01-01',
};

describe('WalletList', () => {
  it('should render loading view when variant is loading', () => {
    render(<WalletList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Wallets...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<WalletList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Wallets')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<WalletList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Wallet is Empty')).toBeTruthy();
  });

  it('should render wallet items when variant is loaded', () => {
    const items = [
      mockWallet,
      { ...mockWallet, id: 2, name: 'Bank Transfer' },
    ];
    render(<WalletList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('Bank Transfer')).toBeTruthy();
  });
});
