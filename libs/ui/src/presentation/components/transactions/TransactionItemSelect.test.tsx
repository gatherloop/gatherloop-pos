import { render, screen } from '@testing-library/react';
import { useMedia } from 'tamagui';
import { TransactionItemSelect } from './TransactionItemSelect';
import { mockProduct, mockProducts } from '../../../../.storybook/mocks/mockData';

const defaultProps = {
  products: mockProducts,
  selectedProduct: mockProduct,
  selectedOptionValues: [],
  onSelectProduct: jest.fn(),
  onUnselectProduct: jest.fn(),
  onOptionValuesChange: jest.fn(),
  onSubmit: jest.fn(),
  searchValue: '',
  onSearchValueChange: jest.fn(),
  onRetryButtonPress: jest.fn(),
  currentPage: 1,
  totalItem: mockProducts.length,
  itemPerPage: 10,
  onPageChange: jest.fn(),
  amount: 1,
  onAmountChange: jest.fn(),
};

describe('TransactionItemSelect — variant dialog (PRD FR-6)', () => {
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  it('renders Cancel and Submit on desktop (media.sm undefined)', () => {
    render(
      <TransactionItemSelect
        {...defaultProps}
        variant={{ type: 'selectingOptions' }}
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('renders Cancel and Submit on compact (media.sm true)', () => {
    (useMedia as jest.Mock).mockReturnValue({ sm: true });

    render(
      <TransactionItemSelect
        {...defaultProps}
        variant={{ type: 'selectingOptions' }}
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('renders every option value for a many-option product on compact', () => {
    (useMedia as jest.Mock).mockReturnValue({ sm: true });

    render(
      <TransactionItemSelect
        {...defaultProps}
        variant={{ type: 'selectingOptions' }}
        selectedProduct={{
          ...mockProduct,
          options: [
            ...mockProduct.options,
            { id: 3, name: 'Spice Level', values: [{ id: 6, name: 'Mild' }] },
          ],
        }}
      />
    );

    expect(screen.getByText('Spice Level')).toBeTruthy();
    expect(screen.getByText('Mild')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });
});
