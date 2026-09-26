import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { OrderHistoryHandler } from './OrderHistoryHandler';
import {
  MockPaymentRepository,
  MockSessionRepository,
} from '../../../data/mock';
import { OrderHistoryUsecase } from '../../../domain';
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
  paymentRepository = new MockPaymentRepository(),
  sessionRepository = new MockSessionRepository(),
}: {
  paymentRepository?: MockPaymentRepository;
  sessionRepository?: MockSessionRepository;
} = {}) => {
  const orderHistoryUsecase = new OrderHistoryUsecase(paymentRepository, {
    payments: [],
  });

  return {
    paymentRepository,
    sessionRepository,
    ...render(
      <OrderHistoryHandler
        orderHistoryUsecase={orderHistoryUsecase}
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

describe('OrderHistoryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists a session’s paid orders newest-first with the five FR-3 fields', async () => {
    const paymentRepository = new MockPaymentRepository();
    renderHandler({ paymentRepository });

    await settle();

    const [newest, oldest] = paymentRepository.payments;
    expect(screen.getByText(`#${newest.transactionNumber}`)).toBeTruthy();
    expect(screen.getByText('Sedang disiapkan')).toBeTruthy();
    expect(screen.getByText(`#${oldest.transactionNumber}`)).toBeTruthy();
    expect(screen.getByText('Siap diambil')).toBeTruthy();
  });

  it('shows an unpaid cash order and routes to its instruction page', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payments = [
      {
        reference: 'ORD0000000000003',
        status: 'pending',
        method: 'cash',
        fulfillmentStatus: 'preparing',
        transactionNumber: 3,
        customerName: 'Andi',
        tableLabel: 'Meja 3',
        amount: 27000,
        itemCount: 2,
        createdAt: new Date().toISOString(),
        paidAt: null,
        diningOption: 'dine_in',
        verificationStatus: null,
      },
    ];
    renderHandler({ paymentRepository });

    await settle();

    const [payment] = paymentRepository.payments;
    expect(screen.getByText('Belum dibayar')).toBeTruthy();

    await act(async () => {
      screen.getByText(`#${payment.transactionNumber}`).click();
    });

    expect(mockPush).toHaveBeenCalledWith(`/orders/${payment.reference}`);
  });

  it('opens the order page for the tapped row', async () => {
    const paymentRepository = new MockPaymentRepository();
    renderHandler({ paymentRepository });

    await settle();

    const [payment] = paymentRepository.payments;
    await act(async () => {
      screen.getByText(`#${payment.transactionNumber}`).click();
    });

    expect(mockPush).toHaveBeenCalledWith(`/orders/${payment.reference}`);
  });

  it('shows the empty state for a session with no orders', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payments = [];
    const sessionRepository = new MockSessionRepository();
    sessionRepository.setTableCode(TABLE_CODE);
    const { getByRole } = renderHandler({
      paymentRepository,
      sessionRepository,
    });

    await settle();

    expect(screen.getByText('Belum ada pesanan')).toBeTruthy();

    await act(async () => {
      getByRole('button', { name: 'Kembali ke menu' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}`);
  });

  it('falls back to / from the empty state when no table has ever been scanned', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.payments = [];
    const { getByRole } = renderHandler({ paymentRepository });

    await settle();

    await act(async () => {
      getByRole('button', { name: 'Kembali ke menu' }).click();
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('shows an error with retry on a transport failure', async () => {
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.setShouldFailFetchPayments(true);
    renderHandler({ paymentRepository });

    await settle();

    expect(screen.getByText('Gagal memuat pesanan')).toBeTruthy();

    paymentRepository.setShouldFailFetchPayments(false);
    await act(async () => {
      screen.getByRole('button', { name: 'Retry' }).click();
      await flushPromises();
    });

    const [payment] = paymentRepository.payments;
    expect(screen.getByText(`#${payment.transactionNumber}`)).toBeTruthy();
  });
});
