import { createContext, ReactNode, useContext } from 'react';
import {
  WalletTransferCreateAction,
  WalletTransferCreateState,
  WalletTransferCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  WalletTransferCreateState,
  WalletTransferCreateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useWalletTransferCreateController = () => {
  const walletCreateController = useContext(Context);
  if (walletCreateController === null) {
    throw new Error(
      'useWalletTransferCreateController is called outside provider'
    );
  }

  return walletCreateController;
};

export type WalletTransferCreateProviderProps = {
  children: ReactNode;
  usecase: WalletTransferCreateUsecase;
};

export const WalletTransferCreateProvider = ({
  children,
  usecase,
}: WalletTransferCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
