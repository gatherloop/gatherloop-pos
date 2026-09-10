import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutHandler } from './CheckoutHandler';
import {
  MockCartQueryRepository,
  MockCartRepository,
  MockPaymentRepository,
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../../data/mock';
import { CartUsecase, CheckoutUsecase, TableResolveUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const TABLE_CODE = '3F7H9K2M5P';

const renderHandler = ({
  enabled = true,
  cartRepository = new MockCartRepository(),
  paymentRepository = new MockPaymentRepository(),
  tableRepository = new MockPublicTableRepository(),
  customerName = '',
}: {
  enabled?: boolean;
  cartRepository?: MockCartRepository;
  paymentRepository?: MockPaymentRepository;
  tableRepository?: MockPublicTableRepository;
  customerName?: string;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const cartUsecase = new CartUsecase(cartRepository, new MockCartQueryRepository());
  const checkoutUsecase = new CheckoutUsecase(paymentRepository, { customerName });

  return {
    cartRepository,
    paymentRepository,
    ...render(
      <CheckoutHandler
        tableResolveUsecase={tableResolveUsecase}
        cartUsecase={cartUsecase}
        checkoutUsecase={checkoutUsecase}
        sessionRepository={new MockSessionRepository()}
        enabled={enabled}
        tableCode={TABLE_CODE}
      />
    ),
  };
};

const settle = async () => {
  await act(async () => {
    await flushPromises();
    await flushPromises();
  });
};

const addItemToCart = (cartRepository: MockCartRepository) =>
  cartRepository.addItem({ variantId: 1, amount: 1, note: '' });

const payButtonName = /^Bayar dengan QRIS/;

describe('CheckoutHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an unavailable message when disabled', async () => {
    renderHandler({ enabled: false });

    await settle();

    expect(screen.getByText('Checkout belum tersedia')).toBeTruthy();
  });

  it('shows an empty-cart message with nothing in the cart', async () => {
    renderHandler();

    await settle();

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('shows the recap and pay button once the cart is loaded', async () => {
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository });

    await settle();

    expect(screen.getByText('1x Es Kopi Susu')).toBeTruthy();
    expect(screen.getByRole('button', { name: payButtonName })).toBeTruthy();
  });

  it('opens the name sheet prefilled from the seeded customer name', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect((screen.getByPlaceholderText('Nama Anda') as HTMLInputElement).value).toBe(
      'Budi'
    );
  });

  it('holds an empty name at the sheet with an error, creating nothing', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(paymentRepository, 'checkout');
    renderHandler({ cartRepository, paymentRepository });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );

    expect(screen.getByText('Nama tidak boleh kosong')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nama Anda')).toBeTruthy();
    expect(checkoutSpy).not.toHaveBeenCalled();

    await settle();
  });

  it('cancelling the name sheet returns to the summary having created nothing', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(paymentRepository, 'checkout');
    renderHandler({ cartRepository, paymentRepository });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(screen.getByRole('button', { name: 'Batal' }));

    expect(screen.queryByPlaceholderText('Nama Anda')).toBeNull();
    expect(checkoutSpy).not.toHaveBeenCalled();
  });

  it('creates the payment and shows the QR once a valid name is submitted', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    renderHandler({ cartRepository, paymentRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(screen.getByText('Simpan QR')).toBeTruthy();
  });

  it('retries a failed checkout by resubmitting, reaching the QR on success', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.setShouldFailCheckout(true);
    renderHandler({ cartRepository, paymentRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(screen.getByText('Gagal membuat pembayaran')).toBeTruthy();

    paymentRepository.setShouldFailCheckout(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await settle();

    expect(screen.getByText('Simpan QR')).toBeTruthy();
  });

  // D12a: the client's clock never declares expiry on its own — an
  // already-elapsed countdown only triggers one final poll, and it's that
  // poll's server-reported status which decides paid vs expired.
  it('redirects to the status page ~2s after the final poll confirms paid', async () => {
    jest.useFakeTimers();
    try {
      const cartRepository = new MockCartRepository();
      await addItemToCart(cartRepository);
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = {
        ...paymentRepository.payment,
        status: 'paid',
        expiredAt: new Date().toISOString(),
      };
      renderHandler({ cartRepository, paymentRepository, customerName: 'Budi' });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      fireEvent.click(screen.getByRole('button', { name: payButtonName }));
      fireEvent.click(
        screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Pembayaran berhasil')).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(mockPush).toHaveBeenCalledWith(
        `/t/${TABLE_CODE}/status?ref=${paymentRepository.payment.reference}`
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers retry and back-to-cart once the countdown expires unconfirmed', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'expired',
      expiredAt: new Date().toISOString(),
    };
    renderHandler({ cartRepository, paymentRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(screen.getByText('Waktu pembayaran habis')).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Kembali ke keranjang' })
    );

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}/cart`);
  });
});
