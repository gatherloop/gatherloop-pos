import { render, screen } from '@testing-library/react';
import { TransactionListItem, TransactionListItemProps } from './TransactionListItem';

const defaultProps: TransactionListItemProps = {
  name: 'Budi',
  source: 'order',
  diningOption: 'dine_in',
  paymentMethod: 'cash',
  paymentVerificationStatus: null,
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
  onVerifyMenuPress: jest.fn(),
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

  it('shows the qris awaiting payment badge for an unpaid qris order', () => {
    render(<TransactionListItem {...defaultProps} paymentMethod="qris" />);

    expect(screen.getByText('QRIS · awaiting payment')).toBeTruthy();
  });

  it('does not show the qris badge once a qris order is paid', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        paymentMethod="qris"
        paidAt="2024-01-20T10:30:00.000Z"
        walletName="QRIS"
      />
    );

    expect(screen.queryByText('QRIS · awaiting payment')).toBeNull();
  });

  it('does not show the qris badge for a cash order', () => {
    render(<TransactionListItem {...defaultProps} paymentMethod="cash" />);

    expect(screen.queryByText('QRIS · awaiting payment')).toBeNull();
  });

  it('does not show the qris badge for a pos transaction', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        source="pos"
        paymentMethod={null}
        table={null}
      />
    );

    expect(screen.queryByText('QRIS · awaiting payment')).toBeNull();
  });

  it('hides the edit menu for an unpaid order transaction', () => {
    render(<TransactionListItem {...defaultProps} />);

    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('shows the edit menu for an unpaid pos transaction', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        source="pos"
        paymentMethod={null}
        table={null}
      />
    );

    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('shows the takeaway badge for a takeaway pos transaction', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        source="pos"
        diningOption="takeaway"
        paymentMethod={null}
        table={null}
      />
    );

    expect(screen.getByText('Takeaway')).toBeTruthy();
  });

  it('shows the takeaway badge for a takeaway order-app transaction', () => {
    render(<TransactionListItem {...defaultProps} diningOption="takeaway" />);

    expect(screen.getByText('Takeaway')).toBeTruthy();
  });

  it('does not show the takeaway badge for a dine-in pos transaction', () => {
    render(
      <TransactionListItem
        {...defaultProps}
        source="pos"
        diningOption="dine_in"
        paymentMethod={null}
        table={null}
      />
    );

    expect(screen.queryByText('Takeaway')).toBeNull();
  });

  it('does not show the takeaway badge for a dine-in order-app transaction', () => {
    render(<TransactionListItem {...defaultProps} diningOption="dine_in" />);

    expect(screen.queryByText('Takeaway')).toBeNull();
  });

  describe('COD verification', () => {
    it('shows the needs confirmation badge for an awaiting COD order', () => {
      render(
        <TransactionListItem
          {...defaultProps}
          paymentMethod="cod"
          paymentVerificationStatus="awaiting"
        />
      );

      expect(screen.getByText('Needs confirmation')).toBeTruthy();
    });

    it('does not show the fulfillment badge for an awaiting COD order', () => {
      render(
        <TransactionListItem
          {...defaultProps}
          paymentMethod="cod"
          paymentVerificationStatus="awaiting"
        />
      );

      expect(screen.queryByText('Preparing')).toBeNull();
    });

    it('shows only the Verify menu item for an awaiting COD order', () => {
      render(
        <TransactionListItem
          {...defaultProps}
          paymentMethod="cod"
          paymentVerificationStatus="awaiting"
        />
      );

      expect(screen.getByText('Verify')).toBeTruthy();
      expect(screen.queryByText('Pay')).toBeNull();
      expect(screen.queryByText('Mark as Ready')).toBeNull();
      expect(screen.queryByText('Delete')).toBeNull();
      expect(screen.queryByText('Print Order Slip')).toBeNull();
    });

    it('shows the COD unpaid badge alongside the fulfillment badge once approved', () => {
      render(
        <TransactionListItem
          {...defaultProps}
          paymentMethod="cod"
          paymentVerificationStatus="approved"
        />
      );

      expect(screen.getByText('COD · unpaid')).toBeTruthy();
      expect(screen.getByText('Preparing')).toBeTruthy();
      expect(screen.queryByText('Needs confirmation')).toBeNull();
    });

    it('does not show the Verify menu item once approved', () => {
      render(
        <TransactionListItem
          {...defaultProps}
          paymentMethod="cod"
          paymentVerificationStatus="approved"
        />
      );

      expect(screen.queryByText('Verify')).toBeNull();
      expect(screen.getByText('Pay')).toBeTruthy();
    });

    it('does not show the COD unpaid badge once paid', () => {
      render(
        <TransactionListItem
          {...defaultProps}
          paymentMethod="cod"
          paymentVerificationStatus="approved"
          paidAt="2024-01-20T10:30:00.000Z"
          walletName="Cash"
        />
      );

      expect(screen.queryByText('COD · unpaid')).toBeNull();
    });
  });
});
