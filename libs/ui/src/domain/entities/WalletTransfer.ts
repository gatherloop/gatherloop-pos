import { Wallet } from './Wallet';

export type WalletTransfer = {
  id: number;
  createdAt: string;
  amount: number;
  fromWallet: Wallet;
  toWallet: Wallet;
};

export type WalletTransferForm = {
  amount: number;
  fromWalletId: number;
  toWalletId: number;
};
