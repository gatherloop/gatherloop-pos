import { z } from 'zod';
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

export const walletTransferFormSchema = z.object({
  amount: z.number().min(1),
  fromWalletId: z.number(),
  toWalletId: z.number(),
}) satisfies z.ZodType<WalletTransferForm>;
