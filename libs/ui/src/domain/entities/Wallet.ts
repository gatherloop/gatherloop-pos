export type Wallet = {
  id: number;
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
  createdAt: string;
};

export type WalletForm = {
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
};
