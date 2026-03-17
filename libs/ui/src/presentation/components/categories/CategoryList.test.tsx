import React from 'react';
import { render, screen } from '@testing-library/react';
import { CategoryList } from './CategoryList';

const baseProps = {
  onRetryButtonPress: jest.fn(),
  onDeleteMenuPress: jest.fn(),
  onEditMenuPress: jest.fn(),
  onItemPress: jest.fn(),
};

describe('CategoryList', () => {
  it('should render loading view when variant is loading', () => {
    render(<CategoryList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Categories...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<CategoryList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Categories')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<CategoryList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Category is Empty')).toBeTruthy();
  });

  it('should render category items when variant is loaded', () => {
    const categories = [
      { id: 1, name: 'Category 1', createdAt: '2024-01-01' },
      { id: 2, name: 'Category 2', createdAt: '2024-01-02' },
    ];
    render(<CategoryList {...baseProps} variant={{ type: 'loaded', categories }} />);
    expect(screen.getByText('Category 1')).toBeTruthy();
    expect(screen.getByText('Category 2')).toBeTruthy();
  });
});
