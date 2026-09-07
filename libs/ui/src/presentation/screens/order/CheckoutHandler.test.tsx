import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutHandler } from './CheckoutHandler';

const mockPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const renderHandler = (enabled: boolean, tableCode = 'ABCDE12345') =>
  render(<CheckoutHandler enabled={enabled} tableCode={tableCode} />);

describe('CheckoutHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the QRIS stub message when enabled', () => {
    renderHandler(true);
    expect(screen.getByText('Pembayaran QRIS — segera hadir')).toBeTruthy();
  });

  it('shows an unavailable message when disabled', () => {
    renderHandler(false);
    expect(screen.getByText('Checkout belum tersedia')).toBeTruthy();
  });

  it('navigates back to the cart when pressed', async () => {
    const user = userEvent.setup();
    renderHandler(true, 'ABCDE12345');

    await user.click(
      screen.getByRole('button', { name: 'Kembali ke keranjang' })
    );

    expect(mockPush).toHaveBeenCalledWith('/t/ABCDE12345/cart');
  });
});
