import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutHandler } from './CheckoutHandler';
import {
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../../data/mock';
import { TableResolveUsecase } from '../../../domain';
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
  tableCode = TABLE_CODE,
  tableRepository = new MockPublicTableRepository(),
  sessionRepository = new MockSessionRepository(),
}: {
  enabled?: boolean;
  tableCode?: string;
  tableRepository?: MockPublicTableRepository;
  sessionRepository?: MockSessionRepository;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: tableCode,
  });

  return {
    tableRepository,
    sessionRepository,
    ...render(
      <CheckoutHandler
        tableResolveUsecase={tableResolveUsecase}
        sessionRepository={sessionRepository}
        enabled={enabled}
        tableCode={tableCode}
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

describe('CheckoutHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the table shell while the table is resolving', async () => {
    renderHandler();
    expect(screen.getByText('Memuat meja...')).toBeTruthy();
    await settle();
  });

  it('shows an invalid-QR message for an unknown table code', async () => {
    const tableRepository = new MockPublicTableRepository();
    tableRepository.tables = {};
    renderHandler({ tableRepository });

    await settle();

    expect(screen.getByText('QR tidak valid')).toBeTruthy();
  });

  it('persists the table code on the session once resolved', async () => {
    const { sessionRepository } = renderHandler();

    await settle();

    expect(sessionRepository.getTableCode()).toBe(TABLE_CODE);
  });

  it('shows the QRIS stub message when enabled', async () => {
    renderHandler({ enabled: true });

    await settle();

    expect(screen.getByText('Pembayaran QRIS — segera hadir')).toBeTruthy();
  });

  it('shows an unavailable message when disabled', async () => {
    renderHandler({ enabled: false });

    await settle();

    expect(screen.getByText('Checkout belum tersedia')).toBeTruthy();
  });

  it('navigates back to the cart when pressed', async () => {
    const user = userEvent.setup();
    renderHandler({ enabled: true, tableCode: TABLE_CODE });

    await settle();

    await user.click(
      screen.getByRole('button', { name: 'Kembali ke keranjang' })
    );

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}/cart`);
  });
});
