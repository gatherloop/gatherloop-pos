import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { OrderStatusHandler } from './OrderStatusHandler';
import { MockPaymentRepository, MockSessionRepository } from '../../../data/mock';
import { OrderStatusUsecase } from '../../../domain';
import { PaymentRepository } from '../../../domain/repositories/payment';
import { flushPromises } from '../../../utils/testUtils';

class KeyConfiguredMockPaymentRepository extends MockPaymentRepository {
  constructor(private readonly accessKey?: string) {
    super();
  }

  override fetchPayment: PaymentRepository['fetchPayment'] = async (
    reference
  ) => {
    if (this.accessKey !== 'the-right-key') {
      return super.fetchPayment(reference);
    }
    return { ...this.payment, reference };
  };
}

const mockPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const TABLE_CODE = '3F7H9K2M5P';
const CASHIER_LOCATION = 'Lantai 1';

const createSessionRepositoryWithTableCode = () => {
  const sessionRepository = new MockSessionRepository();
  sessionRepository.setTableCode(TABLE_CODE);
  return sessionRepository;
};

const renderHandler = ({
  reference,
  paymentRepository = new MockPaymentRepository(),
  sessionRepository = createSessionRepositoryWithTableCode(),
  cashierLocation = CASHIER_LOCATION,
}: {
  reference: string;
  paymentRepository?: MockPaymentRepository;
  sessionRepository?: MockSessionRepository;
  cashierLocation?: string;
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
        cashierLocation={cashierLocation}
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

  it('shows the cash instruction screen for a pending cash payment', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      method: 'cash',
    };
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(
      screen.getByText(`Bayar di kasir ${CASHIER_LOCATION}`)
    ).toBeTruthy();
    expect(
      screen.getByText(`#${paymentRepository.payment.transactionNumber}`)
    ).toBeTruthy();
    expect(screen.getByText('Menunggu pembayaran di kasir…')).toBeTruthy();
  });

  it('flips to the prepared-order screen when a polled cash payment turns paid', async () => {
    jest.useFakeTimers();
    try {
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = {
        ...paymentRepository.payment,
        method: 'cash',
      };
      renderHandler({
        reference: paymentRepository.payment.reference,
        paymentRepository,
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(
        screen.getByText(`Bayar di kasir ${CASHIER_LOCATION}`)
      ).toBeTruthy();

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
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the cash-specific copy when an unpaid cash order expires', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payment = {
      ...paymentRepository.payment,
      method: 'cash',
      status: 'expired',
    };
    renderHandler({
      reference: paymentRepository.payment.reference,
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Waktu pembayaran habis')).toBeTruthy();
    expect(
      screen.getByText(
        'Pesanan dibatalkan karena belum dibayar. Keranjang Anda masih tersimpan.'
      )
    ).toBeTruthy();
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
    } finally {
      jest.useRealTimers();
    }
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

    expect(screen.getByText('Pesanan siap')).toBeTruthy();
    expect(
      screen.getByText(
        `Silakan ambil di kasir dengan menyebutkan nomor #${paymentRepository.payment.transactionNumber}`
      )
    ).toBeTruthy();
    expect(
      screen.getByText(`#${paymentRepository.payment.transactionNumber}`)
    ).toBeTruthy();

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

  it('shows the ready view for a foreign-session reference when the repository is key-configured', async () => {
    const paymentRepository = new KeyConfiguredMockPaymentRepository(
      'the-right-key'
    );
    paymentRepository.payment = {
      ...paymentRepository.payment,
      status: 'paid',
      fulfillmentStatus: 'ready',
    };
    renderHandler({
      reference: 'SOMEONE-ELSES-REFERENCE',
      paymentRepository,
    });

    await settle();

    expect(screen.getByText('Pesanan siap')).toBeTruthy();
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
  });

  it('navigates back to the menu from the not-found state', async () => {
    const { getByRole } = renderHandler({ reference: 'UNKNOWNREF' });

    await settle();

    await act(async () => {
      getByRole('button', { name: 'Kembali ke menu' }).click();
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
});
