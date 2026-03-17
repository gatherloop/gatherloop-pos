import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletTransferList } from './WalletTransferList';
import { WalletTransferListItemProps } from './WalletTransferListItem';

const baseProps = {
  onRetryButtonPress: jest.fn(),
};

const mockTransferItem: WalletTransferListItemProps = {
  toWalletName: 'Bank Transfer',
  amount: 50000,
  createdAt: '2024-01-01T10:00:00Z',
};

describe('WalletTransferList', () => {
  it('should render loading view when variant is loading', () => {
    render(<WalletTransferList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Transfer Histories...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<WalletTransferList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Transfer Histories')).toBeTruthy();
  });

  it('should render empty view when variant is loaded with no items', () => {
    render(<WalletTransferList {...baseProps} variant={{ type: 'loaded', items: [] }} />);
    expect(screen.getByText('Oops, Transfer History is Empty')).toBeTruthy();
  });

  it('should render transfer items when variant is loaded with items', () => {
    const items = [
      mockTransferItem,
      { ...mockTransferItem, toWalletName: 'E-Wallet' },
    ];
    render(<WalletTransferList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Bank Transfer')).toBeTruthy();
    expect(screen.getByText('E-Wallet')).toBeTruthy();
  });
});
