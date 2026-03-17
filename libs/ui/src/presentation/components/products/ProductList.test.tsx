import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductList } from './ProductList';
import { Product } from '../../../domain';

const baseProps = {
  searchValue: '',
  saleType: 'all' as const,
  onSearchValueChange: jest.fn(),
  onSaleTypeChange: jest.fn(),
  onRetryButtonPress: jest.fn(),
  onPageChange: jest.fn(),
  onItemPress: jest.fn(),
  currentPage: 1,
  totalItem: 0,
  itemPerPage: 10,
};

const mockProduct: Product = {
  id: 1,
  name: 'Espresso',
  category: { id: 1, name: 'Beverage', createdAt: '2024-01-01' },
  imageUrl: 'https://example.com/image.jpg',
  createdAt: '2024-01-01',
  options: [],
  saleType: 'purchase',
};

describe('ProductList', () => {
  it('should render loading view when variant is loading', () => {
    render(<ProductList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Products...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<ProductList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Products')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<ProductList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Product is Empty')).toBeTruthy();
  });

  it('should render product items when variant is loaded', () => {
    const items = [
      mockProduct,
      { ...mockProduct, id: 2, name: 'Latte' },
    ];
    render(<ProductList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Espresso')).toBeTruthy();
    expect(screen.getByText('Latte')).toBeTruthy();
  });
});
