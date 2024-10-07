import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionDetailAction,
  TransactionDetailState,
  TransactionDetailUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionDetailState,
  TransactionDetailAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionDetailController = () => {
  const transactionDetailController = useContext(Context);
  if (transactionDetailController === null) {
    throw new Error(
      'useTransactionDetailController is called outside provider'
    );
  }

  return transactionDetailController;
};

export type TransactionDetailProviderProps = {
  children: ReactNode;
  usecase: TransactionDetailUsecase;
};

export const TransactionDetailProvider = ({
  children,
  usecase,
}: TransactionDetailProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
