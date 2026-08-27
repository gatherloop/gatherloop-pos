import { z } from 'zod';
import { Wallet } from './Wallet';

export type Calculation = {
  id: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  wallet: Wallet;
  totalWallet: number;
  totalCalculation: number;
  calculationItems: CalculationItem[];
};

export type CalculationItem = {
  id: number;
  price: number;
  amount: number;
};

export type CalculationForm = {
  walletId: number;
  totalWallet: number;
  calculationItems: CalculationItemForm[];
};

export type CalculationItemForm = {
  id?: number;
  price: number;
  amount: number;
};

// Partial validator, not a parser: `totalWallet` is intentionally undescribed
// and the resolver is called with `{ raw: true }` so it survives submission.
export const calculationFormSchema = z.object({
  walletId: z.number(),
  calculationItems: z
    .array(
      z.lazy(() =>
        z.object({
          price: z.number().min(1),
          amount: z.number().min(0),
        })
      )
    )
    .min(1),
});
