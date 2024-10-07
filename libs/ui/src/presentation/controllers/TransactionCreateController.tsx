import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionCreateAction,
  TransactionCreateState,
  TransactionCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionCreateState,
  TransactionCreateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionCreateController = () => {
  const transactionCreateController = useContext(Context);
  if (transactionCreateController === null) {
    throw new Error(
      'useTransactionCreateController is called outside provider'
    );
  }

  return transactionCreateController;
};

export type TransactionCreateProviderProps = {
  children: ReactNode;
  usecase: TransactionCreateUsecase;
};

export const TransactionCreateProvider = ({
  children,
  usecase,
}: TransactionCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
