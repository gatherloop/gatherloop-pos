import {
  Wallet,
  WalletForm,
  WalletTransfer,
  WalletTransferForm,
} from '../entities';

export interface WalletRepository {
  fetchWalletList: () => Promise<Wallet[]>;

  fetchWalletById: (categoryId: number) => Promise<Wallet>;

  createWallet: (formValues: WalletForm) => Promise<void>;

  updateWallet: (formValues: WalletForm, categoryId: number) => Promise<void>;

  fetchWalletTransferList: (walletId: number) => Promise<WalletTransfer[]>;

  createWalletTransfer: (formValues: WalletTransferForm) => Promise<void>;
}
