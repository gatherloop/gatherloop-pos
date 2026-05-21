import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
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

const internalWallet: Wallet = {
  id: 2,
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
}: {
  walletSelectOptions: { label: string; value: Wallet }[];
  isButtonDisabled?: boolean;
  isOpen?: boolean;
}) => {
  const form = useForm<{ wallet: Wallet; paidAmount: number }>({
    defaultValues: { wallet: mockWallet, paidAmount: 50000 },
  });
  return (
    <TransactionPaymentAlert
      isOpen={isOpen}
      onCancel={jest.fn()}
      form={form}
      onSubmit={jest.fn()}
      walletSelectOptions={walletSelectOptions}
      transactionTotal={50000}
      isButtonDisabled={isButtonDisabled}
    />
  );
};

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
});
