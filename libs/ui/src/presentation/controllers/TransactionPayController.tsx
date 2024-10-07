import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionPayAction,
  TransactionPayState,
  TransactionPayUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionPayState,
  TransactionPayAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionPayController = () => {
  const transactionPayController = useContext(Context);
  if (transactionPayController === null) {
    throw new Error('useTransactionPayController is called outside provider');
  }

  return transactionPayController;
};

export type TransactionPayProviderProps = {
  children: ReactNode;
  usecase: TransactionPayUsecase;
};

export const TransactionPayProvider = ({
  children,
  usecase,
}: TransactionPayProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
