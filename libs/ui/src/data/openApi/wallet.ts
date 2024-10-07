import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletCreate,
  walletFindById,
  WalletFindById200,
  walletFindByIdQueryKey,
  walletList,
  WalletList200,
  walletListQueryKey,
  walletUpdateById,
  Wallet as ApiWallet,
  WalletTransfer as ApiWalletTransfer,
  WalletTransferList200,
  walletTransferListQueryKey,
  walletTransferList,
  walletTransferCreate,
} from '../../../../api-contract/src';
import { Wallet, WalletRepository, WalletTransfer } from '../../domain';

export class OpenAPIWalletRepository implements WalletRepository {
  client: QueryClient;

  walletByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getWalletTransferList: WalletRepository['getWalletTransferList'] = (
    walletId
  ) => {
    const res = this.client.getQueryState<WalletTransferList200>(
      walletTransferListQueryKey(walletId)
    )?.data;

    this.client.removeQueries({
      queryKey: walletTransferListQueryKey(walletId),
    });

    return res?.data.map(transformers.walletTransfer) ?? [];
  };

  fetchWalletTransferList: WalletRepository['fetchWalletTransferList'] = (
    walletId
  ) => {
    return this.client
      .fetchQuery({
        queryKey: walletTransferListQueryKey(walletId),
        queryFn: () => walletTransferList(walletId),
      })
      .then((data) => data.data.map(transformers.walletTransfer));
  };

  createWalletTransfer: WalletRepository['createWalletTransfer'] = (
    formValues
  ) => {
    return walletTransferCreate(formValues.fromWalletId, {
      amount: formValues.amount,
      toWalletId: formValues.toWalletId,
    }).then();
  };

  getWalletById: WalletRepository['getWalletById'] = (walletId) => {
    const res = this.client.getQueryState<WalletFindById200>(
      walletFindByIdQueryKey(walletId)
    )?.data;

    this.client.removeQueries({ queryKey: walletFindByIdQueryKey(walletId) });

    return res ? transformers.wallet(res.data) : null;
  };

  getWalletByIdServerParams: WalletRepository['getWalletByIdServerParams'] =
    () => this.walletByIdServerParams;

  fetchWalletById: WalletRepository['fetchWalletById'] = (walletId) => {
    return this.client
      .fetchQuery({
        queryKey: walletFindByIdQueryKey(walletId),
        queryFn: () => walletFindById(walletId),
      })
      .then(({ data }) => transformers.wallet(data));
  };

  createWallet: WalletRepository['createWallet'] = (formValues) => {
    return walletCreate(formValues).then();
  };

  updateWallet: WalletRepository['updateWallet'] = (formValues, walletId) => {
    return walletUpdateById(walletId, formValues).then();
  };

  getWalletList: WalletRepository['getWalletList'] = () => {
    const res = this.client.getQueryState<WalletList200>(
      walletListQueryKey()
    )?.data;

    this.client.removeQueries({ queryKey: walletListQueryKey() });

    return res?.data.map(transformers.wallet) ?? [];
  };

  fetchWalletList: WalletRepository['fetchWalletList'] = () => {
    return this.client
      .fetchQuery({
        queryKey: walletListQueryKey(),
        queryFn: () => walletList(),
      })
      .then((data) => data.data.map(transformers.wallet));
  };
}

const transformers = {
  wallet: (wallet: ApiWallet): Wallet => ({
    id: wallet.id,
    createdAt: wallet.createdAt,
    name: wallet.name,
    balance: wallet.balance,
    paymentCostPercentage: wallet.paymentCostPercentage,
  }),
  walletTransfer: (walletTransfer: ApiWalletTransfer): WalletTransfer => ({
    id: walletTransfer.id,
    amount: walletTransfer.amount,
    createdAt: walletTransfer.createdAt,
    fromWallet: {
      balance: walletTransfer.fromWallet.balance,
      createdAt: walletTransfer.fromWallet.createdAt,
      id: walletTransfer.fromWallet.id,
      name: walletTransfer.fromWallet.name,
      paymentCostPercentage: walletTransfer.fromWallet.paymentCostPercentage,
    },
    toWallet: {
      balance: walletTransfer.toWallet.balance,
      createdAt: walletTransfer.toWallet.createdAt,
      id: walletTransfer.toWallet.id,
      name: walletTransfer.toWallet.name,
      paymentCostPercentage: walletTransfer.toWallet.paymentCostPercentage,
    },
  }),
};
