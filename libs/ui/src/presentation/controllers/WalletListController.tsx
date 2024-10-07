import { createContext, ReactNode, useContext } from 'react';
import {
  WalletListAction,
  WalletListState,
  WalletListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<WalletListState, WalletListAction> | null;

const Context = createContext<ContextValue>(null);

export const useWalletListController = () => {
  const walletListController = useContext(Context);
  if (walletListController === null) {
    throw new Error('useWalletListController is called outside provider');
  }

  return walletListController;
};

export type WalletListProviderProps = {
  children: ReactNode;
  usecase: WalletListUsecase;
};

export const WalletListProvider = ({
  children,
  usecase,
}: WalletListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
