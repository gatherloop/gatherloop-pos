import { fireEvent, render, screen } from '@testing-library/react';
import { useMedia } from 'tamagui';
import { TransactionItemSelect } from './TransactionItemSelect';
import {
  mockProduct,
  mockProducts,
  mockVariants,
} from '../../../../../.storybook/mocks/mockData';
import type { Product, Variant } from '../../../../domain';

const defaultProps = {
  products: mockProducts,
  selectedProduct: mockProduct,
  selectedProductVariants: [] as Variant[],
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

describe('TransactionItemSelect — availability enforcement (PRD phase 11)', () => {
  it('shows a sold-out product tile but does not let it be selected', () => {
    const onSelectProduct = jest.fn();
    const soldOutProduct: Product = {
      ...mockProduct,
      id: 99,
      name: 'Es Kopi Susu Vanilla',
      isSellable: false,
    };

    render(
      <TransactionItemSelect
        {...defaultProps}
        variant={{ type: 'loaded' }}
        products={[soldOutProduct]}
        onSelectProduct={onSelectProduct}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Es Kopi Susu Vanilla' })
    ).toBeTruthy();
    expect(screen.getByText('Sold out')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('heading', { name: 'Es Kopi Susu Vanilla' })
    );
    expect(onSelectProduct).not.toHaveBeenCalled();
  });

  it('disables a sold-out option value while its siblings stay selectable', () => {
    const variantsWithHotSoldOut: Variant[] = [
      mockVariants[0],
      { ...mockVariants[1], isSellable: false },
    ];

    render(
      <TransactionItemSelect
        {...defaultProps}
        variant={{ type: 'selectingOptions' }}
        selectedProduct={mockProduct}
        selectedProductVariants={variantsWithHotSoldOut}
        selectedOptionValues={[
          { id: 1, name: 'Iced' },
          { id: 4, name: 'Regular' },
        ]}
      />
    );

    expect(
      (screen.getByRole('radio', { name: 'Hot' }) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole('radio', { name: 'Iced' }) as HTMLInputElement)
        .disabled
    ).toBe(false);
  });

  it('caps the amount stepper at the remaining quantity of the selected variant', () => {
    const onAmountChange = jest.fn();
    const variantsWithCappedQuantity: Variant[] = [
      { ...mockVariants[0], sellableQuantity: 3 },
      mockVariants[1],
    ];

    render(
      <TransactionItemSelect
        {...defaultProps}
        variant={{ type: 'selectingOptions' }}
        selectedProduct={mockProduct}
        selectedProductVariants={variantsWithCappedQuantity}
        selectedOptionValues={[
          { id: 1, name: 'Iced' },
          { id: 4, name: 'Regular' },
        ]}
        amount={3}
        onAmountChange={onAmountChange}
      />
    );

    expect(screen.getByText('3 left')).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue('3'), {
      target: { value: '10' },
    });

    expect(onAmountChange).toHaveBeenCalledWith(3);
  });
});
