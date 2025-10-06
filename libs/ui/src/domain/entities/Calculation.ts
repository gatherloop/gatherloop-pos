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
