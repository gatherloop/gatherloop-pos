import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalculationList } from './CalculationList';
import { Calculation } from '../../../domain';

const baseProps = {
  onRetryButtonPress: jest.fn(),
  onEditMenuPress: jest.fn(),
  onDeleteMenuPress: jest.fn(),
  onCompleteMenuPress: jest.fn(),
  onItemPress: jest.fn(),
};

const mockWallet = {
  id: 1,
  name: 'Wallet 1',
  balance: 100000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-01-01',
};

const mockCalculation: Calculation = {
  id: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  completedAt: null,
  wallet: mockWallet,
  totalWallet: 100000,
  totalCalculation: 100000,
  calculationItems: [],
};

describe('CalculationList', () => {
  it('should render loading view when variant is loading', () => {
    render(<CalculationList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Calculations...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<CalculationList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Calculations')).toBeTruthy();
  });

  it('should render empty view when variant is loaded with no items', () => {
    render(<CalculationList {...baseProps} variant={{ type: 'loaded', items: [] }} />);
    expect(screen.getByText('Oops, Calculation is Empty')).toBeTruthy();
  });

  it('should render calculation items when variant is loaded with items', () => {
    const items = [
      mockCalculation,
      { ...mockCalculation, id: 2, wallet: { ...mockWallet, name: 'Wallet 2' } },
    ];
    render(<CalculationList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Wallet 1')).toBeTruthy();
    expect(screen.getByText('Wallet 2')).toBeTruthy();
  });
});
