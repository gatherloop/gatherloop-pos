import { render, screen } from '@testing-library/react';
import { TransactionListItem, TransactionListItemProps } from './TransactionListItem';

const defaultProps: TransactionListItemProps = {
  name: 'Budi',
  source: 'order',
  paymentMethod: 'cash',
  table: { id: 1, label: 'A1', floorNumber: 1 },
  pagerNumber: 0,
  transactionNumber: 12,
  total: 45000,
  createdAt: '2024-01-20T10:00:00.000Z',
  paidAt: undefined,
  completedAt: null,
  walletName: undefined,
  onPayMenuPress: jest.fn(),
  onUnpayMenuPress: jest.fn(),
  onCompleteMenuPress: jest.fn(),
  onUncompleteMenuPress: jest.fn(),
  onEditMenuPress: jest.fn(),
  onDeleteMenuPress: jest.fn(),
  onPrintInvoiceMenuPress: jest.fn(),
  onPrintOrderSlipMenuPress: jest.fn(),
};

describe('TransactionListItem', () => {
  it('shows the cash awaiting payment badge for an unpaid cash order', () => {
    render(<TransactionListItem {...defaultProps} />);

    expect(screen.getByText('Cash · awaiting payment')).toBeTruthy();
  });

  it('does not show the badge once a cash order is paid', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        paidAt="2024-01-20T10:30:00.000Z"
        walletName="Cash"
      />
    );

    expect(screen.queryByText('Cash · awaiting payment')).toBeNull();
  });

  it('does not show the badge for a qris order', () => {
    render(<TransactionListItem {...defaultProps} paymentMethod="qris" />);

    expect(screen.queryByText('Cash · awaiting payment')).toBeNull();
  });

  it('does not show the badge for a pos transaction', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        source="pos"
        paymentMethod={null}
        table={null}
      />
    );

    expect(screen.queryByText('Cash · awaiting payment')).toBeNull();
  });
});
