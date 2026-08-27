import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMedia } from 'tamagui';
import { TransactionPaymentAlert } from './TransactionPaymentAlert';
import { Wallet } from '../../../domain';

const mockWallet: Wallet = {
  id: 1,
  name: 'Cash',
  balance: 1000000,
  paymentCostPercentage: 0,
  isCashless: false,
  isPaymentTarget: true,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const cashlessWallet: Wallet = {
  id: 2,
  name: 'Bank Transfer',
  balance: 0,
  paymentCostPercentage: 0,
  isCashless: true,
  isPaymentTarget: true,
  createdAt: '2024-03-21T00:00:00.000Z',
};

const internalWallet: Wallet = {
  id: 3,
  name: 'Brankas',
  balance: 500000,
  paymentCostPercentage: 0,
  isCashless: false,
  isPaymentTarget: false,
  createdAt: '2024-03-21T00:00:00.000Z',
};

const Wrapper = ({
  walletSelectOptions,
  isButtonDisabled = false,
  isOpen = true,
  onSubmit = jest.fn(),
  transactionTotal = 50000,
}: {
  walletSelectOptions: { label: string; value: Wallet }[];
  isButtonDisabled?: boolean;
  isOpen?: boolean;
  onSubmit?: (values: { wallet: Wallet; paidAmount: number }) => void;
  transactionTotal?: number;
}) => (
  <TransactionPaymentAlert
    isOpen={isOpen}
    onCancel={jest.fn()}
    onSubmit={onSubmit}
    walletSelectOptions={walletSelectOptions}
    transactionTotal={transactionTotal}
    isButtonDisabled={isButtonDisabled}
  />
);

describe('TransactionPaymentAlert', () => {
  describe('with eligible wallets', () => {
    it('renders the wallet select when options are provided', () => {
      const options = [{ label: mockWallet.name, value: mockWallet }];
      render(<Wrapper walletSelectOptions={options} />);
      expect(screen.getByRole('option', { name: 'Cash' })).toBeTruthy();
    });

    it('does not show the empty-state message when wallets are present', () => {
      const options = [{ label: mockWallet.name, value: mockWallet }];
      render(<Wrapper walletSelectOptions={options} />);
      expect(
        screen.queryByText(/No wallets are configured to receive payments/)
      ).toBeNull();
    });

    it('enables the Submit button when wallets are present and isButtonDisabled is false', () => {
      const options = [{ label: mockWallet.name, value: mockWallet }];
      render(<Wrapper walletSelectOptions={options} isButtonDisabled={false} />);
      expect(
        (screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled
      ).toBe(false);
    });
  });

  describe('with no eligible wallets (empty-state)', () => {
    it('shows the empty-state message when no wallet options are provided', () => {
      render(<Wrapper walletSelectOptions={[]} />);
      expect(
        screen.getByText(
          /No wallets are configured to receive payments\. Configure one in Wallet Settings\./
        )
      ).toBeTruthy();
    });

    it('does not render the wallet select when no options are provided', () => {
      render(<Wrapper walletSelectOptions={[]} />);
      expect(screen.queryByRole('option')).toBeNull();
    });

    it('disables the Submit button when no wallet options are provided', () => {
      render(<Wrapper walletSelectOptions={[]} isButtonDisabled={false} />);
      expect(
        (screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled
      ).toBe(true);
    });
  });

  describe('filtering responsibility', () => {
    it('renders only the options passed in — internal wallets must be excluded upstream', () => {
      const eligibleOptions = [{ label: mockWallet.name, value: mockWallet }];
      render(<Wrapper walletSelectOptions={eligibleOptions} />);
      expect(screen.getByRole('option', { name: 'Cash' })).toBeTruthy();
      expect(screen.queryByRole('option', { name: internalWallet.name })).toBeNull();
    });
  });

  it('renders the transaction total amount', () => {
    const options = [{ label: mockWallet.name, value: mockWallet }];
    render(<Wrapper walletSelectOptions={options} />);
    expect(screen.getByText(/50\.000/)).toBeTruthy();
  });

  it('is not rendered when isOpen is false', () => {
    const { container } = render(
      <Wrapper
        walletSelectOptions={[{ label: mockWallet.name, value: mockWallet }]}
        isOpen={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  // The paidAmount/isCashless sync effect (moved here from the controller,
  // TRD phase 14) — selecting a cashless wallet forces paidAmount to the
  // transaction total, and selecting a cash wallet leaves it alone.
  describe('cashless sync', () => {
    it('forces paidAmount to the transaction total when a cashless wallet is selected', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const options = [{ label: cashlessWallet.name, value: cashlessWallet }];
      render(
        <Wrapper
          walletSelectOptions={options}
          onSubmit={onSubmit}
          transactionTotal={50000}
        />
      );

      await user.click(screen.getByRole('option', { name: 'Bank Transfer' }));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      // The resolver only validates (and so only passes through)
      // `wallet.id` — see `transactionPayFormSchema`'s comment.
      expect(onSubmit.mock.calls[0][0]).toEqual({
        wallet: { id: cashlessWallet.id },
        paidAmount: 50000,
      });
    });

    it('does not render the paid-amount field for a cashless wallet', async () => {
      const user = userEvent.setup();
      const options = [{ label: cashlessWallet.name, value: cashlessWallet }];
      render(<Wrapper walletSelectOptions={options} />);

      await user.click(screen.getByRole('option', { name: 'Bank Transfer' }));

      expect(
        screen.queryByRole('textbox', { name: 'Paid Amount' })
      ).toBeNull();
    });

    it('leaves the user-entered paid amount alone when a cash wallet is selected', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const options = [{ label: mockWallet.name, value: mockWallet }];
      render(
        <Wrapper
          walletSelectOptions={options}
          onSubmit={onSubmit}
          transactionTotal={50000}
        />
      );

      await user.click(screen.getByRole('option', { name: 'Cash' }));
      const paidAmountInput = screen.getByRole('textbox', {
        name: 'Paid Amount',
      });
      await user.clear(paidAmountInput);
      await user.type(paidAmountInput, '75000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onSubmit.mock.calls[0][0]).toEqual({
        wallet: { id: mockWallet.id },
        paidAmount: 75000,
      });
    });
  });

  // PRD FR-7: the payment alert must be usable at compact width — it can
  // open on top of (or right after) the compact cart sheet on Create.
  describe('compact layout (media.sm true)', () => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue({ sm: true });
    });

    afterEach(() => {
      (useMedia as jest.Mock).mockReturnValue({});
    });

    it('still renders the wallet select, total and Submit', () => {
      const options = [{ label: mockWallet.name, value: mockWallet }];
      render(<Wrapper walletSelectOptions={options} />);

      expect(screen.getByRole('option', { name: 'Cash' })).toBeTruthy();
      expect(screen.getByText(/50\.000/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('still renders the paid-amount and change fields for a non-cashless wallet', async () => {
      // mockWallet has isCashless: false — cash payments need a paid amount
      // and a computed change, unlike a cashless (bank transfer) wallet.
      const user = userEvent.setup();
      const options = [{ label: mockWallet.name, value: mockWallet }];
      render(<Wrapper walletSelectOptions={options} />);

      await user.click(screen.getByRole('option', { name: 'Cash' }));

      expect(
        screen.getByRole('textbox', { name: 'Paid Amount' })
      ).toBeTruthy();
      expect(screen.getByText('Change')).toBeTruthy();
    });
  });
});
