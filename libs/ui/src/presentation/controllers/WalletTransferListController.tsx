import { createContext, ReactNode, useContext } from 'react';
import {
  WalletTransferListAction,
  WalletTransferListState,
  WalletTransferListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  WalletTransferListState,
  WalletTransferListAction
> | null;

const Context = createContext<ContextValue>(null);

export const useWalletTransferListController = () => {
  const walletListController = useContext(Context);
  if (walletListController === null) {
    throw new Error(
      'useWalletTransferListController is called outside provider'
    );
  }

  return walletListController;
};

export type WalletTransferListProviderProps = {
  children: ReactNode;
  usecase: WalletTransferListUsecase;
};

export const WalletTransferListProvider = ({
  children,
  usecase,
}: WalletTransferListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
