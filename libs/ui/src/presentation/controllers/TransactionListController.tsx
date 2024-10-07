import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionListAction,
  TransactionListState,
  TransactionListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionListState,
  TransactionListAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionListController = () => {
  const transactionListController = useContext(Context);
  if (transactionListController === null) {
    throw new Error('useTransactionListController is called outside provider');
  }

  return transactionListController;
};

export type TransactionListProviderProps = {
  children: ReactNode;
  usecase: TransactionListUsecase;
};

export const TransactionListProvider = ({
  children,
  usecase,
}: TransactionListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
