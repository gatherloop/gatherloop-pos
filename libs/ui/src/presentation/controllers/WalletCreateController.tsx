import { createContext, ReactNode, useContext } from 'react';
import {
  WalletCreateAction,
  WalletCreateState,
  WalletCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<WalletCreateState, WalletCreateAction> | null;

const Context = createContext<ContextValue>(null);

export const useWalletCreateController = () => {
  const walletCreateController = useContext(Context);
  if (walletCreateController === null) {
    throw new Error('useWalletCreateController is called outside provider');
  }

  return walletCreateController;
};

export type WalletCreateProviderProps = {
  children: ReactNode;
  usecase: WalletCreateUsecase;
};

export const WalletCreateProvider = ({
  children,
  usecase,
}: WalletCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
