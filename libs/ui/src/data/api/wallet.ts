import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletCreate,
  walletFindById,
  walletFindByIdQueryKey,
  walletList,
  walletListQueryKey,
  walletUpdateById,
  walletTransferListQueryKey,
  walletTransferList,
  walletTransferCreate,
} from '../../../../api-contract/src';
import { Wallet, WalletRepository, WalletTransfer } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiWallet, toApiWalletTransfer, toWallet, toWalletTransfer } from './wallet.transformer';

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
      .then((data) => data.data.map(toWalletTransfer));
  };

  createWalletTransfer: WalletRepository['createWalletTransfer'] = (
    formValues
  ) => {
    const body = toApiWalletTransfer(formValues);
    return walletTransferCreate(body.fromWalletId, {
      amount: body.amount,
      toWalletId: body.toWalletId,
    }).then();
  };

  fetchWalletById = (walletId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: walletFindByIdQueryKey(walletId),
        queryFn: () => walletFindById(walletId, options),
      })
      .then(({ data }) => toWallet(data));
  };

  createWallet: WalletRepository['createWallet'] = (formValues) => {
    return walletCreate(toApiWallet(formValues)).then();
  };

  updateWallet: WalletRepository['updateWallet'] = (formValues, walletId) => {
    return walletUpdateById(walletId, toApiWallet(formValues)).then();
  };

  fetchWalletList = (options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: walletListQueryKey(),
        queryFn: () => walletList(options),
      })
      .then((data) => data.data.map(toWallet));
  };
}
