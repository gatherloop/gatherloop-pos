import { createContext, ReactNode, useContext } from 'react';
import {
  WalletUpdateAction,
  WalletUpdateState,
  WalletUpdateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<WalletUpdateState, WalletUpdateAction> | null;

const Context = createContext<ContextValue>(null);

export const useWalletUpdateController = () => {
  const walletUpdateController = useContext(Context);
  if (walletUpdateController === null) {
    throw new Error('useWalletUpdateController is called outside provider');
  }

  return walletUpdateController;
};

export type WalletUpdateProviderProps = {
  children: ReactNode;
  usecase: WalletUpdateUsecase;
};

export const WalletUpdateProvider = ({
  children,
  usecase,
}: WalletUpdateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
