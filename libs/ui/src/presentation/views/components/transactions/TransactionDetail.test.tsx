import { render, screen } from '@testing-library/react';
import { TransactionDetail, TransactionDetailProps } from './TransactionDetail';

const defaultProps: TransactionDetailProps = {
  name: 'Budi',
  source: 'order',
  paymentMethod: 'cash',
  table: { id: 1, label: 'A1', floorNumber: 1 },
  pagerNumber: 0,
  transactionNumber: 12,
  createdAt: '2024-01-20T10:00:00.000Z',
  paidAt: undefined,
  completedAt: null,
  walletName: undefined,
  total: 45000,
  paidAmount: 0,
  transactionItems: [],
  transactionCoupons: [],
};

describe('TransactionDetail', () => {
  it('shows the payment method row for a cash order transaction', () => {
    render(<TransactionDetail {...defaultProps} />);

    expect(screen.getByText('Payment Method')).toBeTruthy();
    expect(screen.getByText('Cash')).toBeTruthy();
  });

  it('shows QRIS as the payment method label for a qris order transaction', () => {
    render(<TransactionDetail {...defaultProps} paymentMethod="qris" />);

    expect(screen.getByText('QRIS')).toBeTruthy();
  });

  it('does not show the payment method row for a pos transaction', () => {
    render(
      <TransactionDetail {...defaultProps} source="pos" paymentMethod={null} table={null} />
    );

    expect(screen.queryByText('Payment Method')).toBeNull();
  });
});
