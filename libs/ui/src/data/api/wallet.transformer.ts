// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Wallet as ApiWallet,
  WalletTransfer as ApiWalletTransfer,
} from '../../../../api-contract/src';
import { Wallet, WalletForm, WalletTransfer, WalletTransferForm } from '../../domain';

export function toWallet(wallet: ApiWallet): Wallet {
  return {
    id: wallet.id,
    createdAt: wallet.createdAt,
    name: wallet.name,
    balance: wallet.balance,
    paymentCostPercentage: wallet.paymentCostPercentage,
    isCashless: wallet.isCashless,
  };
}

export function toApiWallet(form: WalletForm) {
  return {
    name: form.name,
    balance: form.balance,
    paymentCostPercentage: form.paymentCostPercentage,
    isCashless: form.isCashless,
  };
}

export function toWalletTransfer(walletTransfer: ApiWalletTransfer): WalletTransfer {
  return {
    id: walletTransfer.id,
    amount: walletTransfer.amount,
    createdAt: walletTransfer.createdAt,
    fromWallet: toWallet(walletTransfer.fromWallet),
    toWallet: toWallet(walletTransfer.toWallet),
  };
}

export function toApiWalletTransfer(form: WalletTransferForm) {
  return {
    fromWalletId: form.fromWalletId,
    amount: form.amount,
    toWalletId: form.toWalletId,
  };
}
