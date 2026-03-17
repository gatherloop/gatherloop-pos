import React from 'react';
import { render, screen } from '@testing-library/react';
import { VariantList } from './VariantList';
import { Variant } from '../../../domain';

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

const mockVariant: Variant = {
  id: 1,
  name: 'Small',
  price: 15000,
  product: {
    id: 1,
    name: 'Espresso',
    category: { id: 1, name: 'Beverage', createdAt: '2024-01-01' },
    imageUrl: 'https://example.com/image.jpg',
    createdAt: '2024-01-01',
    options: [],
    saleType: 'purchase',
  },
  materials: [],
  createdAt: '2024-01-01',
  values: [],
};

describe('VariantList', () => {
  it('should render loading view when variant is loading', () => {
    render(<VariantList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Variants...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<VariantList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Variants')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<VariantList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Variant is Empty')).toBeTruthy();
  });

  it('should render variant items when variant is loaded', () => {
    const items = [
      mockVariant,
      {
        ...mockVariant,
        id: 2,
        product: { ...mockVariant.product, name: 'Latte' },
      },
    ];
    render(<VariantList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Espresso')).toBeTruthy();
    expect(screen.getByText('Latte')).toBeTruthy();
  });
});
