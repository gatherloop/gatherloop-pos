export type Wallet = {
  id: number;
  name: string;
  balance: number;
  paymentCostPercentage: number;
  createdAt: string;
};

export type WalletForm = {
  name: string;
  balance: number;
  paymentCostPercentage: number;
};
