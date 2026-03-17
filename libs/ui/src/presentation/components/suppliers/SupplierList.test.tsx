import React from 'react';
import { render, screen } from '@testing-library/react';
import { SupplierList } from './SupplierList';
import { Supplier } from '../../../domain';

const baseProps = {
  searchValue: '',
  onSearchValueChange: jest.fn(),
  onRetryButtonPress: jest.fn(),
  onPageChange: jest.fn(),
  onItemPress: jest.fn(),
  currentPage: 1,
  totalItem: 0,
  itemPerPage: 10,
};

const mockSupplier: Supplier = {
  id: 1,
  name: 'Coffee Supplier',
  address: 'Jl. Kopi No. 1',
  mapsLink: 'https://maps.google.com',
  createdAt: '2024-01-01',
};

describe('SupplierList', () => {
  it('should render loading view when variant is loading', () => {
    render(<SupplierList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Suppliers...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<SupplierList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Suppliers')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<SupplierList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Supplier is Empty')).toBeTruthy();
  });

  it('should render supplier items when variant is loaded', () => {
    const items = [
      mockSupplier,
      { ...mockSupplier, id: 2, name: 'Tea Supplier' },
    ];
    render(<SupplierList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Coffee Supplier')).toBeTruthy();
    expect(screen.getByText('Tea Supplier')).toBeTruthy();
  });
});
