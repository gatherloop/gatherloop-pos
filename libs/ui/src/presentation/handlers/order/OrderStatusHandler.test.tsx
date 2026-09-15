import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { OrderStatusHandler } from './OrderStatusHandler';
import {
  MockPaymentRepository,
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../../data/mock';
import { OrderStatusUsecase, TableResolveUsecase } from '../../../domain';
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
  reference,
  paymentRepository = new MockPaymentRepository(),
  tableRepository = new MockPublicTableRepository(),
}: {
  reference: string;
  paymentRepository?: MockPaymentRepository;
  tableRepository?: MockPublicTableRepository;
}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
  });

  return {
    paymentRepository,
    ...render(
      <OrderStatusHandler
        tableResolveUsecase={tableResolveUsecase}
        orderStatusUsecase={orderStatusUsecase}
        sessionRepository={new MockSessionRepository()}
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
      expect(
        screen.getByText(paymentRepository.payment.tableLabel)
      ).toBeTruthy();
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
});
