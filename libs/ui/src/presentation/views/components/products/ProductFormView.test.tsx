import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from '../../../../domain';
import {
  ProductFormView,
  ProductFormViewProps,
  productCreateFormResolver,
} from './ProductFormView';

const defaultValues: ProductForm = {
  name: 'Es Kopi Susu',
  description: '',
  recipe: '',
  categoryId: 1,
  imageUrl: 'https://placehold.jp/120x120.png',
  options: [],
  saleType: 'purchase',
  status: 'published',
  availabilityTracking: 'none',
};

const baseProps: ProductFormViewProps = {
  variant: { type: 'loaded' },
  defaultValues,
  resolver: productCreateFormResolver,
  variants: [],
  onSubmit: jest.fn(),
  categorySelectOptions: [{ label: 'Beverages', value: 1 }],
  isSubmitDisabled: false,
  isSubmitting: false,
};

describe('ProductFormView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all three availability tracking options', () => {
    render(<ProductFormView {...baseProps} />);

    expect(screen.getByRole('option', { name: 'None' })).toBeTruthy();
    expect(
      screen.getByRole('option', { name: 'Shared across variants' })
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Per variant' })).toBeTruthy();
  });

  it('does not show the confirmation when the selected value does not change', async () => {
    const user = userEvent.setup();
    render(<ProductFormView {...baseProps} />);

    await user.click(screen.getByRole('option', { name: 'None' }));

    expect(screen.queryByText('Change availability tracking?')).toBeNull();
  });

  it('shows the confirmation when the availability tracking value changes', async () => {
    const user = userEvent.setup();
    render(<ProductFormView {...baseProps} />);

    await user.click(
      screen.getByRole('option', { name: 'Shared across variants' })
    );

    expect(screen.getByText('Change availability tracking?')).toBeTruthy();
  });

  it('reverts to the previous value when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    render(<ProductFormView {...baseProps} />);

    await user.click(screen.getByRole('option', { name: 'Per variant' }));
    expect(screen.getByText('Change availability tracking?')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Change availability tracking?')).toBeNull();

    await user.click(
      screen.getByRole('option', { name: 'Shared across variants' })
    );
    expect(screen.getByText('Change availability tracking?')).toBeTruthy();
  });

  it('adopts the new value as the baseline once the confirmation is accepted', async () => {
    const user = userEvent.setup();
    render(<ProductFormView {...baseProps} />);

    await user.click(screen.getByRole('option', { name: 'Per variant' }));
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.queryByText('Change availability tracking?')).toBeNull();

    await user.click(screen.getByRole('option', { name: 'Per variant' }));
    expect(screen.queryByText('Change availability tracking?')).toBeNull();
  });
});
