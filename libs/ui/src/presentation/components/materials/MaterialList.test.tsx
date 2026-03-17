import React from 'react';
import { render, screen } from '@testing-library/react';
import { MaterialList } from './MaterialList';
import { Material } from '../../../domain';

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

const mockMaterial: Material = {
  id: 1,
  name: 'Sugar',
  price: 15000,
  unit: 'kg',
  weeklyUsage: 5,
  createdAt: '2024-01-01',
};

describe('MaterialList', () => {
  it('should render loading view when variant is loading', () => {
    render(<MaterialList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Materials...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<MaterialList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Materials')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<MaterialList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Material is Empty')).toBeTruthy();
  });

  it('should render material items when variant is loaded', () => {
    const items = [
      mockMaterial,
      { ...mockMaterial, id: 2, name: 'Flour' },
    ];
    render(<MaterialList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Sugar')).toBeTruthy();
    expect(screen.getByText('Flour')).toBeTruthy();
  });
});
