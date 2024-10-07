import { createContext, ReactNode, useContext } from 'react';
import {
  WalletDetailAction,
  WalletDetailState,
  WalletDetailUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<WalletDetailState, WalletDetailAction> | null;

const Context = createContext<ContextValue>(null);

export const useWalletDetailController = () => {
  const walletDetailController = useContext(Context);
  if (walletDetailController === null) {
    throw new Error('useWalletDetailController is called outside provider');
  }

  return walletDetailController;
};

export type WalletDetailProviderProps = {
  children: ReactNode;
  usecase: WalletDetailUsecase;
};

export const WalletDetailProvider = ({
  children,
  usecase,
}: WalletDetailProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
