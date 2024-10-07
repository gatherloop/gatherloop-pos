import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionDeleteAction,
  TransactionDeleteState,
  TransactionDeleteUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionDeleteState,
  TransactionDeleteAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionDeleteController = () => {
  const transactionDeleteController = useContext(Context);
  if (transactionDeleteController === null) {
    throw new Error(
      'useTransactionDeleteController is called outside provider'
    );
  }

  return transactionDeleteController;
};

export type TransactionDeleteProviderProps = {
  children: ReactNode;
  usecase: TransactionDeleteUsecase;
};

export const TransactionDeleteProvider = ({
  children,
  usecase,
}: TransactionDeleteProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
