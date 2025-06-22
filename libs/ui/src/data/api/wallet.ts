import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletCreate,
  walletFindById,
  walletFindByIdQueryKey,
  walletList,
  walletListQueryKey,
  walletUpdateById,
  Wallet as ApiWallet,
  WalletTransfer as ApiWalletTransfer,
  walletTransferListQueryKey,
  walletTransferList,
  walletTransferCreate,
} from '../../../../api-contract/src';
import { Wallet, WalletRepository, WalletTransfer } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiWalletRepository implements WalletRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchWalletTransferList = (
    walletId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: walletTransferListQueryKey(walletId, {
          sortBy: 'created_at',
          order: 'desc',
        }),
        queryFn: () =>
          walletTransferList(
            walletId,
            {
              sortBy: 'created_at',
              order: 'desc',
            },
            options
          ),
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

  fetchWalletById = (walletId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: walletFindByIdQueryKey(walletId),
        queryFn: () => walletFindById(walletId, options),
      })
      .then(({ data }) => transformers.wallet(data));
  };

  createWallet: WalletRepository['createWallet'] = (formValues) => {
    return walletCreate(formValues).then();
  };

  updateWallet: WalletRepository['updateWallet'] = (formValues, walletId) => {
    return walletUpdateById(walletId, formValues).then();
  };

  fetchWalletList = (options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: walletListQueryKey(),
        queryFn: () => walletList(options),
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
