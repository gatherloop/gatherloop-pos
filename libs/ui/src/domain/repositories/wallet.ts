import {
  Wallet,
  WalletForm,
  WalletTransfer,
  WalletTransferForm,
} from '../entities';

export interface WalletRepository {
  getWalletByIdServerParams: () => number | null;

  getWalletList: () => Wallet[];

  getWalletById: (categoryId: number) => Wallet | null;

  fetchWalletList: () => Promise<Wallet[]>;

  fetchWalletById: (categoryId: number) => Promise<Wallet>;

  createWallet: (formValues: WalletForm) => Promise<void>;

  updateWallet: (formValues: WalletForm, categoryId: number) => Promise<void>;

  getWalletTransferList: (walletId: number) => WalletTransfer[];

  fetchWalletTransferList: (walletId: number) => Promise<WalletTransfer[]>;

  createWalletTransfer: (formValues: WalletTransferForm) => Promise<void>;
}
