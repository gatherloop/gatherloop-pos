import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { OrderStatusHandler } from './OrderStatusHandler';
import { MockPaymentRepository, MockSessionRepository } from '../../../data/mock';
import { OrderStatusUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// libs/ui bans a direct `next/router` import outside utils/; require() reaches the
// same jest-mapped module (src/__mocks__/next/router.ts) without tripping that rule.
type RouterMock = {
  push: jest.Mock;
  replace: jest.Mock;
  events: {
    on: (type: string, handler: (...args: unknown[]) => void) => void;
    off: (type: string, handler: (...args: unknown[]) => void) => void;
    emit: (type: string, ...args: unknown[]) => void;
  };
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Router: RouterMock = require('next/router').default;

const TABLE_CODE = '3F7H9K2M5P';

const createSessionRepositoryWithTableCode = () => {
  const sessionRepository = new MockSessionRepository();
  sessionRepository.setTableCode(TABLE_CODE);
  return sessionRepository;
};

const renderHandler = ({
  reference,
  paymentRepository = new MockPaymentRepository(),
  sessionRepository = createSessionRepositoryWithTableCode(),
}: {
  reference: string;
  paymentRepository?: MockPaymentRepository;
  sessionRepository?: MockSessionRepository;
}) => {
  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
  });

  return {
    paymentRepository,
    sessionRepository,
    ...render(
      <OrderStatusHandler
        orderStatusUsecase={orderStatusUsecase}
        sessionRepository={sessionRepository}
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

describe('OrderStatusHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the QR for a pending payment', async () => {
    const paymentRepository = new MockPaymentRepository();
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Menunggu pembayaran…')).toBeTruthy();
  });

  it('flips to the prepared-order screen when the polled payment turns paid', async () => {
    jest.useFakeTimers();
    try {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = {
        ...paymentRepository.payment,
        customerName: 'Budi',
      };
      renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Menunggu pembayaran…')).toBeTruthy();

      paymentRepository.payment = {
        ...paymentRepository.payment,
        status: 'paid',
      };
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      expect(
        screen.getByText(`#${paymentRepository.payment.transactionNumber}`)
      ).toBeTruthy();
      // The order's table label now appears twice: once in the header (D4)
      // and once in the preparing view's own table line.
      expect(
        screen.getAllByText(paymentRepository.payment.tableLabel)
      ).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the prepared-order screen for an already-paid payment', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
      customerName: 'Budi',
    };
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(
      screen.getByText(
        'Pesanan Anda sedang disiapkan. Mohon tunggu di meja Anda, kami akan memberi tahu di halaman ini saat pesanan siap diambil.'
      )
    ).toBeTruthy();
    expect(screen.queryByText(/menit|jam|detik/)).toBeNull();
  });

  it('shows the pickup instruction when the payment is already ready', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
      fulfillmentStatus: 'ready',
    };
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Pesanan siap!')).toBeTruthy();
    expect(
      screen.getByText(
        `Silakan ambil di kasir dengan menyebutkan nomor #${paymentRepository.payment.transactionNumber}.`
      )
    ).toBeTruthy();
    expect(
      screen.getByText(`#${paymentRepository.payment.transactionNumber}`)
    ).toBeTruthy();
    expect(screen.queryByText(/menit|jam|detik/)).toBeNull();
  });

  it('clears the remembered active reference once the order is ready', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
      fulfillmentStatus: 'ready',
    };
    const sessionRepository = createSessionRepositoryWithTableCode();
    sessionRepository.setActiveReference(paymentRepository.payment.reference);
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
      sessionRepository,
    });

    await settle();

    expect(sessionRepository.getActiveReference()).toBeNull();
  });

  it('does not clear the remembered active reference while still preparing', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
      fulfillmentStatus: 'preparing',
    };
    const sessionRepository = createSessionRepositoryWithTableCode();
    sessionRepository.setActiveReference(paymentRepository.payment.reference);
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
      sessionRepository,
    });

    await settle();

    expect(sessionRepository.getActiveReference()).toBe(
      paymentRepository.payment.reference
    );
  });

  it('shows the expiry screen for an expired payment', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'expired',
    };
    const { getByRole } = renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Waktu pembayaran habis')).toBeTruthy();

    await act(async () => {
      getByRole('button', { name: 'Kembali ke keranjang' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}/cart`);
  });

  it('shows a not-found message for an unknown reference', async () => {
    renderHandler({ reference: 'UNKNOWNREF' });

    await settle();

    expect(screen.getByText('Pesanan tidak ditemukan')).toBeTruthy();
  });

  it('shows a not-found message for a reference belonging to another session', async () => {
    const paymentRepository = new MockPaymentRepository();
    renderHandler({
      reference: 'SOMEONE-ELSES-REFERENCE',
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Pesanan tidak ditemukan')).toBeTruthy();
  });

  it('shows an error with retry on a transport failure', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
    };
    paymentRepository.setShouldFailFetch(true);
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Gagal memuat pesanan')).toBeTruthy();

    paymentRepository.setShouldFailFetch(false);
    await act(async () => {
      screen.getByRole('button', { name: 'Retry' }).click();
      await flushPromises();
    });

    expect(
      screen.getByText(
        'Pesanan Anda sedang disiapkan. Mohon tunggu di meja Anda, kami akan memberi tahu di halaman ini saat pesanan siap diambil.'
      )
    ).toBeTruthy();
  });

  it('navigates back to the menu from the not-found state', async () => {
    const { getByRole } = renderHandler({ reference: 'UNKNOWNREF' });

    await settle();

    await act(async () => {
      getByRole('button', { name: 'Kembali ke menu' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}`);
  });

  it('navigates back to the menu from "Pesan lagi"', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
    };
    const { getByRole } = renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    await act(async () => {
      getByRole('button', { name: 'Pesan lagi' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}`);
  });

  it('falls back to / when the session has never scanned a table', async () => {
    const sessionRepository = new MockSessionRepository();
    const { getByRole } = renderHandler({
      reference: 'UNKNOWNREF',
      sessionRepository,
    });

    await settle();

    await act(async () => {
      getByRole('button', { name: 'Kembali ke menu' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('navigates to /orders from the header history button', async () => {
    const { getByRole } = renderHandler({ reference: 'UNKNOWNREF' });

    await settle();

    await act(async () => {
      getByRole('button', { name: 'Pesanan Saya' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith('/orders');
  });

  describe('leave confirmation', () => {
    const renderPreparing = async () => {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = {
        ...paymentRepository.payment,
        status: 'paid',
      };
      const result = renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
      });
      await settle();
      return result;
    };

    const attemptNavigation = async (url: string) => {
      expect(() => {
        act(() => {
          Router.events.emit('routeChangeStart', url);
        });
      }).toThrow();

      await act(async () => {
        await flushPromises();
      });
    };

    it('opens the leave-confirmation dialog on an attempted in-app navigation while preparing', async () => {
      await renderPreparing();

      await attemptNavigation('/t/other-table');

      expect(screen.getByRole('button', { name: 'Tetap di sini' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Keluar' })).toBeTruthy();
    });

    it('keeps the route when "Tetap di sini" is pressed', async () => {
      await renderPreparing();

      await attemptNavigation('/t/other-table');

      await act(async () => {
        screen.getByRole('button', { name: 'Tetap di sini' }).click();
      });

      expect(Router.push).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Keluar' })).toBeNull();
    });

    it('allows navigation when "Keluar" is pressed', async () => {
      await renderPreparing();

      await attemptNavigation('/t/other-table');

      await act(async () => {
        screen.getByRole('button', { name: 'Keluar' }).click();
      });

      expect(Router.push).toHaveBeenCalledWith('/t/other-table');
      expect(screen.queryByRole('button', { name: 'Keluar' })).toBeNull();
    });

    it('shows no leave-confirmation dialog once the order is ready', async () => {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = {
        ...paymentRepository.payment,
        status: 'paid',
        fulfillmentStatus: 'ready',
      };
      renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
      });
      await settle();

      act(() => {
        Router.events.emit('routeChangeStart', '/t/other-table');
      });

      expect(screen.queryByRole('button', { name: 'Keluar' })).toBeNull();
    });
  });
});
