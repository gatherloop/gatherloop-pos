import { z } from 'zod';

export type Wallet = {
  id: number;
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
  isPaymentTarget: boolean;
  createdAt: string;
};

export type WalletForm = {
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
  isPaymentTarget: boolean;
};

export const walletFormSchema = z.object({
  name: z.string().min(1),
  balance: z.number(),
  paymentCostPercentage: z.number(),
  isCashless: z.boolean(),
  isPaymentTarget: z.boolean(),
}) satisfies z.ZodType<WalletForm>;
