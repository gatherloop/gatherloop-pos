import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { OrderStatusHandler } from './OrderStatusHandler';
import {
  MockPaymentRepository,
  MockSessionRepository,
  MockWebPushRepository,
  MockWebPushSubscriptionRepository,
} from '../../../data/mock';
import { OrderNotificationSubscribeUsecase, OrderStatusUsecase } from '../../../domain';
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

const createSessionRepositoryWithTableCode = () => {
  const sessionRepository = new MockSessionRepository();
  sessionRepository.setTableCode(TABLE_CODE);
  return sessionRepository;
};

const renderHandler = ({
  reference,
  paymentRepository = new MockPaymentRepository(),
  sessionRepository = createSessionRepositoryWithTableCode(),
  webPushRepository = new MockWebPushRepository(),
  webPushSubscriptionRepository = new MockWebPushSubscriptionRepository(),
}: {
  reference: string;
  paymentRepository?: MockPaymentRepository;
  sessionRepository?: MockSessionRepository;
  webPushRepository?: MockWebPushRepository;
  webPushSubscriptionRepository?: MockWebPushSubscriptionRepository;
}) => {
  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
  });
  const orderNotificationSubscribeUsecase = new OrderNotificationSubscribeUsecase(
    webPushRepository,
    webPushSubscriptionRepository
  );

  return {
    paymentRepository,
    sessionRepository,
    webPushRepository,
    webPushSubscriptionRepository,
    ...render(
      <OrderStatusHandler
        orderStatusUsecase={orderStatusUsecase}
        orderNotificationSubscribeUsecase={orderNotificationSubscribeUsecase}
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

    const [firstItem] = paymentRepository.payment.items;
    expect(
      screen.getByText(`${firstItem.amount}x ${firstItem.name}`)
    ).toBeTruthy();
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

  describe('order notification opt-in', () => {
    it('reaches the subscribed confirmation when the CTA is tapped with permission granted', async () => {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = { ...paymentRepository.payment, status: 'paid' };
      const { getByRole } = renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
      });

      await settle();

      expect(
        getByRole('button', { name: 'Beri tahu saya' })
      ).toBeTruthy();

      await act(async () => {
        getByRole('button', { name: 'Beri tahu saya' }).click();
      });
      await settle();

      expect(screen.getByText('Kami akan memberi tahu saat pesanan siap.')).toBeTruthy();
      expect(getByRole('button', { name: 'Matikan' })).toBeTruthy();
      expect(screen.queryByText('Beri tahu saya')).toBeNull();
    });

    it('renders the settings line when permission is denied', async () => {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = { ...paymentRepository.payment, status: 'paid' };
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setPermissionStatus('denied');
      const { getByRole } = renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
        webPushRepository,
      });

      await settle();

      await act(async () => {
        getByRole('button', { name: 'Beri tahu saya' }).click();
      });
      await settle();

      expect(screen.getByText('Notifikasi dinonaktifkan')).toBeTruthy();
    });

    it('renders no card at all for an unsupported browser', async () => {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = { ...paymentRepository.payment, status: 'paid' };
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setSupportStatus('unsupported');
      renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
        webPushRepository,
      });

      await settle();

      expect(screen.queryByText('Beri tahu saya')).toBeNull();
      expect(
        screen.queryByText('Kami akan memberi tahu saat pesanan siap.')
      ).toBeNull();
    });
  });
});
