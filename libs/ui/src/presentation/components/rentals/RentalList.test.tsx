import React from 'react';
import { render, screen } from '@testing-library/react';
import { RentalList } from './RentalList';
import { Rental } from '../../../domain';

const baseProps = {
  searchValue: '',
  onSearchValueChange: jest.fn(),
  checkoutStatus: 'all' as const,
  onCheckoutStatusChange: jest.fn(),
  currentPage: 1,
  onPageChange: jest.fn(),
  totalItem: 0,
  itemPerPage: 10,
  onRetryButtonPress: jest.fn(),
};

const mockVariant = {
  id: 1,
  name: 'Small',
  price: 15000,
  product: {
    id: 1,
    name: 'Bicycle',
    category: { id: 1, name: 'Rental', createdAt: '2024-01-01' },
    imageUrl: 'https://example.com/image.jpg',
    createdAt: '2024-01-01',
    options: [],
    saleType: 'rental' as const,
  },
  materials: [],
  createdAt: '2024-01-01',
  values: [],
};

const mockRental: Rental = {
  id: 1,
  code: 'RNT-001',
  name: 'Alice',
  variant: mockVariant,
  createdAt: '2024-01-01T10:00:00Z',
  checkinAt: '2024-01-01T10:00:00Z',
  checkoutAt: null,
};

describe('RentalList', () => {
  it('should render loading view when variant is loading', () => {
    render(<RentalList {...baseProps} rentals={[]} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Rentals...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<RentalList {...baseProps} rentals={[]} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Rentals')).toBeTruthy();
  });

  it('should render empty view when variant is loaded with no rentals', () => {
    render(<RentalList {...baseProps} rentals={[]} variant={{ type: 'loaded' }} />);
    expect(screen.getByText('Oops, Rental is Empty')).toBeTruthy();
  });

  it('should render rental items when variant is loaded with rentals', () => {
    const rentals = [
      mockRental,
      { ...mockRental, id: 2, name: 'Bob' },
    ];
    render(<RentalList {...baseProps} rentals={rentals} variant={{ type: 'loaded' }} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });
});
