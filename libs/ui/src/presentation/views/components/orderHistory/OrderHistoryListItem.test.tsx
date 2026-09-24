import { render, screen } from '@testing-library/react';
import {
  OrderHistoryListItem,
  OrderHistoryListItemProps,
} from './OrderHistoryListItem';

const defaultProps: OrderHistoryListItemProps = {
  transactionNumber: 12,
  status: 'paid',
  method: 'qris',
  fulfillmentStatus: 'preparing',
  createdAt: '2024-01-20T10:00:00.000Z',
  tableLabel: 'Meja 3',
  customerName: 'Andi',
  itemCount: 3,
  amount: 45000,
  onPress: jest.fn(),
};

describe('OrderHistoryListItem', () => {
  it('shows the fulfillment pill for a paid order', () => {
    render(<OrderHistoryListItem {...defaultProps} />);

    expect(screen.getByText('Sedang disiapkan')).toBeTruthy();
  });

  it('shows the pending QRIS pill for a pending qris payment', () => {
    render(<OrderHistoryListItem {...defaultProps} status="pending" />);

    expect(screen.getByText('Menunggu pembayaran QRIS')).toBeTruthy();
  });

  it('shows the pending cash pill for a pending cash payment', () => {
    render(
      <OrderHistoryListItem {...defaultProps} status="pending" method="cash" />
    );

    expect(screen.getByText('Belum dibayar')).toBeTruthy();
  });

  it('links a pending order to its countdown page like a paid one', () => {
    render(<OrderHistoryListItem {...defaultProps} status="pending" />);

    screen.getByText('#12').click();

    expect(defaultProps.onPress).toHaveBeenCalled();
  });
});
