import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionPrintAction,
  TransactionPrintState,
  TransactionPrintUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionPrintState,
  TransactionPrintAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionPrintController = () => {
  const transactionDetailController = useContext(Context);
  if (transactionDetailController === null) {
    throw new Error('useTransactionPrintController is called outside provider');
  }

  return transactionDetailController;
};

export type TransactionPrintProviderProps = {
  children: ReactNode;
  usecase: TransactionPrintUsecase;
};

export const TransactionPrintProvider = ({
  children,
  usecase,
}: TransactionPrintProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
