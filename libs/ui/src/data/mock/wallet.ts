import {
  Wallet,
  WalletForm,
  WalletTransfer,
  WalletTransferForm,
} from '../../domain/entities';
import { WalletRepository } from '../../domain/repositories/wallet';

const initialWallets: Wallet[] = [
  {
    id: 1,
    name: 'Cash',
    balance: 1000000,
    paymentCostPercentage: 0,
    isCashless: false,
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Bank Transfer',
    balance: 5000000,
    paymentCostPercentage: 2,
    isCashless: true,
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

const initialWalletTransfers: WalletTransfer[] = [
  {
    id: 1,
    createdAt: '2024-03-20T00:00:00.000Z',
    amount: 100000,
    fromWallet: { ...initialWallets[0] },
    toWallet: { ...initialWallets[1] },
  },
];

export class MockWalletRepository implements WalletRepository {
  wallets: Wallet[] = [...initialWallets];
  walletTransfers: WalletTransfer[] = [...initialWalletTransfers];

  private nextWalletId = 3;
  private nextTransferId = 2;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchWalletList(): Promise<Wallet[]> {
    if (this.shouldFail) throw new Error('Failed to fetch wallets');
    return [...this.wallets];
  }

  async fetchWalletById(categoryId: number): Promise<Wallet> {
    if (this.shouldFail) throw new Error('Failed to fetch wallet');
    const wallet = this.wallets.find((w) => w.id === categoryId);
    if (!wallet) throw new Error('Wallet not found');
    return { ...wallet };
  }

  async createWallet(formValues: WalletForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create wallet');
    this.wallets.push({
      id: this.nextWalletId++,
      name: formValues.name,
      balance: formValues.balance,
      paymentCostPercentage: formValues.paymentCostPercentage,
      isCashless: formValues.isCashless,
      createdAt: new Date().toISOString(),
    });
  }

  async updateWallet(
    formValues: WalletForm,
    categoryId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update wallet');
    const idx = this.wallets.findIndex((w) => w.id === categoryId);
    if (idx === -1) throw new Error('Wallet not found');
    this.wallets[idx] = {
      ...this.wallets[idx],
      name: formValues.name,
      balance: formValues.balance,
      paymentCostPercentage: formValues.paymentCostPercentage,
      isCashless: formValues.isCashless,
    };
  }

  async fetchWalletTransferList(walletId: number): Promise<WalletTransfer[]> {
    if (this.shouldFail) throw new Error('Failed to fetch wallet transfers');
    return this.walletTransfers.filter(
      (t) => t.fromWallet.id === walletId || t.toWallet.id === walletId
    );
  }

  async createWalletTransfer(formValues: WalletTransferForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create wallet transfer');
    const fromWallet = this.wallets.find(
      (w) => w.id === formValues.fromWalletId
    );
    const toWallet = this.wallets.find((w) => w.id === formValues.toWalletId);
    if (!fromWallet || !toWallet) throw new Error('Wallet not found');
    this.walletTransfers.push({
      id: this.nextTransferId++,
      createdAt: new Date().toISOString(),
      amount: formValues.amount,
      fromWallet: { ...fromWallet },
      toWallet: { ...toWallet },
    });
  }

  reset() {
    this.wallets = [...initialWallets];
    this.walletTransfers = [...initialWalletTransfers];
    this.nextWalletId = 3;
    this.nextTransferId = 2;
    this.shouldFail = false;
  }
}
