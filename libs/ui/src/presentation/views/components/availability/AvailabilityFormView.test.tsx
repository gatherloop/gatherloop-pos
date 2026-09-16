import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMedia } from 'tamagui';
import { AvailabilityForm, AvailabilityProduct } from '../../../../domain';
import { toAvailabilityUpdateForm } from '../../../../utils';
import { AvailabilityFormView, AvailabilityFormViewProps } from './AvailabilityFormView';

const products: AvailabilityProduct[] = [
  {
    productId: 1,
    productName: 'Es Kopi Susu',
    categoryId: 1,
    categoryName: 'Minuman',
    availabilityTracking: 'none',
    isAvailable: true,
    isSellable: true,
    variants: [
      { variantId: 1, variantName: 'Vanilla', isAvailable: false, isSellable: false },
      { variantId: 2, variantName: 'Banana', isAvailable: true, isSellable: true },
    ],
  },
  {
    productId: 2,
    productName: 'Soft Cookies',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'variant',
    isAvailable: true,
    isSellable: true,
    sellableQuantity: 6,
    variants: [
      {
        variantId: 3,
        variantName: 'Choco',
        isAvailable: true,
        availableQuantity: 6,
        isSellable: true,
        sellableQuantity: 6,
      },
      {
        variantId: 4,
        variantName: 'Red Velvet',
        isAvailable: true,
        availableQuantity: 0,
        isSellable: false,
        sellableQuantity: 0,
      },
    ],
  },
  {
    productId: 3,
    productName: 'Pancong',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'product',
    isAvailable: true,
    availableQuantity: -2,
    isSellable: false,
    sellableQuantity: 0,
    variants: [
      { variantId: 5, variantName: 'Pancong Choco', isAvailable: true, isSellable: false },
    ],
  },
];

const defaultValues: AvailabilityForm = toAvailabilityUpdateForm(products);

const baseProps: AvailabilityFormViewProps = {
  variant: { type: 'loaded' },
  products,
  defaultValues,
  onSubmit: jest.fn(),
  isSubmitDisabled: false,
  isSubmitting: false,
  onViewHistoryPress: jest.fn(),
};

describe('AvailabilityFormView', () => {
  afterEach(() => {
    jest.clearAllMocks();
    (useMedia as jest.Mock).mockReturnValue({});
  });

  it('shows the loading view while fetching', () => {
    render(<AvailabilityFormView {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Availability...')).toBeTruthy();
  });

  it('shows the error view with a retry button', async () => {
    const user = userEvent.setup();
    const onRetryButtonPress = jest.fn();
    render(
      <AvailabilityFormView
        {...baseProps}
        variant={{ type: 'error', onRetryButtonPress }}
      />
    );

    expect(screen.getByText('Failed to Fetch Availability')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryButtonPress).toHaveBeenCalled();
  });

  it('shows an empty state when there are no products', () => {
    render(
      <AvailabilityFormView
        {...baseProps}
        products={[]}
        defaultValues={{ products: [], variants: [] }}
      />
    );

    expect(screen.getByText('No products yet')).toBeTruthy();
  });

  it('renders every product and variant row grouped by category', () => {
    render(<AvailabilityFormView {...baseProps} />);

    expect(screen.getByText('Minuman')).toBeTruthy();
    expect(screen.getAllByText('Snack')).toHaveLength(1);
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Vanilla')).toBeTruthy();
    expect(screen.getByText('Soft Cookies')).toBeTruthy();
    expect(screen.getByText('Pancong')).toBeTruthy();
  });

  it('shows the sold out counter and a Sold out badge on each unsellable row', () => {
    render(<AvailabilityFormView {...baseProps} />);

    expect(screen.getByText('1 / 3 products sold out')).toBeTruthy();
    expect(screen.getAllByText('Sold out').length).toBeGreaterThan(0);
  });

  it('shows a quantity input only at the level the product tracks', () => {
    render(<AvailabilityFormView {...baseProps} />);

    // The search box plus one quantity input per counted row: Soft Cookies'
    // two variants (variant-level tracking) and Pancong itself (product-level).
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  it('shows a message when the search matches nothing', async () => {
    const user = userEvent.setup();
    render(<AvailabilityFormView {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText('Search product by name'),
      'does not exist'
    );

    expect(
      await screen.findByText('No products match the current search or filter')
    ).toBeTruthy();
  });

  it('toggles the sold-out-only filter', async () => {
    const user = userEvent.setup();
    render(<AvailabilityFormView {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Show only sold out' }));

    expect(screen.getByRole('button', { name: 'Show all products' })).toBeTruthy();
  });

  it('shows the server error banner', () => {
    render(<AvailabilityFormView {...baseProps} serverError="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('calls onSubmit with the current form values when Save is pressed', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AvailabilityFormView {...baseProps} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit.mock.calls[0][0]).toEqual(defaultValues);
  });

  it('reflects a toggled switch in the submitted values', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AvailabilityFormView {...baseProps} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('switch', { name: 'Vanilla' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit.mock.calls[0][0]).toEqual({
      ...defaultValues,
      variants: [
        { ...defaultValues.variants[0], isAvailable: true },
        ...defaultValues.variants.slice(1),
      ],
    });
  });

  it('calls onViewHistoryPress with the product level, id and name', async () => {
    const user = userEvent.setup();
    const onViewHistoryPress = jest.fn();
    render(<AvailabilityFormView {...baseProps} onViewHistoryPress={onViewHistoryPress} />);

    await user.click(screen.getByRole('button', { name: 'View history for Pancong' }));

    expect(onViewHistoryPress).toHaveBeenCalledWith('product', 3, 'Pancong');
  });

  it('calls onViewHistoryPress with the variant level, id and name', async () => {
    const user = userEvent.setup();
    const onViewHistoryPress = jest.fn();
    render(<AvailabilityFormView {...baseProps} onViewHistoryPress={onViewHistoryPress} />);

    await user.click(screen.getByRole('button', { name: 'View history for Vanilla' }));

    expect(onViewHistoryPress).toHaveBeenCalledWith('variant', 1, 'Vanilla');
  });
});
